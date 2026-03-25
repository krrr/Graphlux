import os
import sys
import ctypes
import asyncio
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select
from typing import List, Any, Dict
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from .db import get_session
from .models import Task, Folder, SystemSettings
from .engine.executor import TaskExecutor

router = APIRouter()

class ExecutionRequest(BaseModel):
    task: Dict[str, Any] = None
    task_id: int = None
    file_path: str

@router.post("/execute")
async def execute_task_endpoint(request: ExecutionRequest):
    """
    Endpoint to trigger Task execution.
    """
    if not os.path.exists(request.file_path):
        return JSONResponse(status_code=400, content={"error": "File not found"})

    task_json = request.task
    if request.task_id is not None:
        from cyberhamster.db import engine
        from cyberhamster.models import Task
        with Session(engine) as session:
            task_obj = session.get(Task, request.task_id)
            if not task_obj:
                return JSONResponse(status_code=404, content={"error": "Task not found"})
            task_json = task_obj.json_data

    if not task_json:
        return JSONResponse(status_code=400, content={"error": "No Task provided"})

    # Send a log message via websocket
    await manager.broadcast(f"Starting execution for: {request.file_path}")

    executor = TaskExecutor(task_json)

    # Run in threadpool to not block the asyncio loop
    loop = asyncio.get_event_loop()
    success = await loop.run_in_executor(None, executor.execute, request.file_path)

    if success:
        await manager.broadcast(f"Successfully finished execution for: {request.file_path}")
        return {"status": "success", "message": "Task execution completed"}
    else:
        await manager.broadcast(f"Failed execution for: {request.file_path}")
        return JSONResponse(status_code=500, content={"status": "error", "message": "Task execution failed"})

# In-memory store for connected websocket clients for logs
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/logs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We keep the connection open and wait for messages from client if any
            data = await websocket.receive_text()
            # Could handle ping/pong or other client messages here
    except WebSocketDisconnect:
        manager.disconnect(websocket)
# --- Task ---

@router.get("/tasks", response_model=List[Task])
def get_tasks(session: Session = Depends(get_session)):
    return session.exec(select(Task)).all()

@router.get("/tasks/{task_id}", response_model=Task)
def get_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/tasks", response_model=Task)
def create_task(task: Task, session: Session = Depends(get_session)):
    if task.json_data:
        validate_dag(task.json_data)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task_update: Task, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)
    
    if "json_data" in update_data:
        validate_dag(update_data["json_data"])

    for key, value in update_data.items():
        if key != "id": # Don't update ID
            setattr(task, key, value)

    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Check if there are folders using this Task
    folders = session.exec(select(Folder).where(Folder.task_id == task_id)).all()
    if folders:
        raise HTTPException(status_code=400, detail="Cannot delete Task. It is used by existing folders.")

    session.delete(task)
    session.commit()
    return {"message": "Task deleted successfully"}

# --- Folder ---

@router.get("/folders", response_model=List[Folder])
def get_folders(session: Session = Depends(get_session)):
    return session.exec(select(Folder)).all()

@router.post("/folders", response_model=Folder)
def create_folder(folder: Folder, session: Session = Depends(get_session)):
    # Verify Task exists
    task = session.get(Task, folder.task_id)
    if not task:
        raise HTTPException(status_code=400, detail="Invalid Task ID")

    session.add(folder)
    session.commit()
    session.refresh(folder)

    # Notify task manager
    from .task_manager import task_manager
    task_manager.add_folder(folder)

    return folder

@router.put("/folders/{folder_id}", response_model=Folder)
def update_folder(folder_id: int, folder_update: Folder, session: Session = Depends(get_session)):
    folder = session.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    update_data = folder_update.model_dump(exclude_unset=True)

    # Check if Task exists if updating Task ID
    if "task_id" in update_data and update_data["task_id"] != folder.task_id:
        task = session.get(Task, update_data["task_id"])
        if not task:
            raise HTTPException(status_code=400, detail="Invalid Task ID")

    # If watch_folder changed or status changed, we need to update the task manager
    needs_manager_update = False
    old_folder = folder.watch_folder

    for key, value in update_data.items():
        if key != "id":
            if key in ("watch_folder", "status", "task_id", "real_time_watch", "scan_interval", "filename_regex") and getattr(folder, key) != value:
                needs_manager_update = True
            setattr(folder, key, value)

    session.add(folder)
    session.commit()
    session.refresh(folder)

    if needs_manager_update:
        from .task_manager import task_manager
        task_manager.update_folder(folder, old_folder)

    return folder

@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: int, session: Session = Depends(get_session)):
    folder = session.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    session.delete(folder)
    session.commit()

    from .task_manager import task_manager
    task_manager.remove_folder(folder)

    return {"message": "Folder deleted successfully"}

# --- File System ---

@router.get("/fs/list")
def list_directory(path: str = None, showHidden: bool = False):
    if not path:
        if sys.platform == 'win32':
            drives = []
            bitmask = ctypes.windll.kernel32.GetLogicalDrives()
            for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                if bitmask & 1:
                    drives.append({
                        "name": f"{letter}:\\",
                        "path": f"{letter}:\\",
                        "is_dir": True
                    })
                bitmask >>= 1
            return drives
        else:
            return [{"name": "/", "path": "/", "is_dir": True}]

    if not os.path.exists(path):
        raise HTTPException(status_code=400, detail="Path does not exist")

    if not os.path.isdir(path):
        path = os.path.dirname(path)
        if not path or not os.path.isdir(path):
             raise HTTPException(status_code=400, detail="Invalid directory path")

    try:
        items = []
        for name in os.listdir(path):
            if sys.platform != 'win32' and (not showHidden and name.startswith('.')):
                continue
            elif sys.platform == 'win32' and (name == '$RECYCLE.BIN' or name == 'System Volume Information'):
                continue
            full_path = os.path.join(path, name)
            is_dir = os.path.isdir(full_path)
            items.append({
                "name": name,
                "path": full_path,
                "is_dir": is_dir
            })

        # Sort directories first, then alphabetically
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SystemSettings ---

@router.get("/settings", response_model=SystemSettings)
def get_settings(session: Session = Depends(get_session)):
    settings = session.get(SystemSettings, 1)
    if not settings:
        settings = SystemSettings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings

@router.put("/settings", response_model=SystemSettings)
def update_settings(settings_update: SystemSettings, session: Session = Depends(get_session)):
    settings = session.get(SystemSettings, 1)
    if not settings:
        settings = SystemSettings(id=1)

    update_data = settings_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key != "id":
            setattr(settings, key, value)

    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings


def validate_dag(dag_json: Any):
    if not dag_json or not isinstance(dag_json, dict) or not dag_json.get("nodes"):
        return

    nodes = dag_json.get("nodes", {})
    edges = dag_json.get("edges", [])
    start_node_id = dag_json.get("start_node")

    if not start_node_id:
        raise HTTPException(status_code=400, detail="Start node is missing.")
    if start_node_id not in nodes:
        raise HTTPException(status_code=400, detail="Start node ID not found in nodes.")

    # Adjacency list: node -> branch -> [targets]
    adj = {node_id: {} for node_id in nodes}
    for edge in edges:
        source = edge.get("source")
        branch = edge.get("branch", "default")
        target = edge.get("target")
        if source in adj:
            if branch not in adj[source]:
                adj[source][branch] = []
            adj[source][branch].append(target)

    memo = {}
    visiting = set()

    def check_node(node_id: str) -> bool:
        node = nodes.get(node_id)
        if not node:
            return False

        if node.get("type") == "FinishNode":
            return True
        if node_id in visiting:
            return False # Cycle detected (reachable from Start and doesn't reach Finish)
        if node_id in memo:
            return memo[node_id]

        visiting.add(node_id)

        node_type = node.get("type")
        if node_type == "ConditionNode":
            required_branches = ["true_branch", "false_branch"]
        else:
            required_branches = ["default"]

        for branch in required_branches:
            targets = adj[node_id].get(branch, [])
            if not targets:
                # This branch is not connected, leading to an incomplete path
                visiting.remove(node_id)
                memo[node_id] = False
                return False

            for target_id in targets:
                if not check_node(target_id):
                    visiting.remove(node_id)
                    memo[node_id] = False
                    return False

        visiting.remove(node_id)
        memo[node_id] = True
        return True

    if not check_node(start_node_id):
        raise HTTPException(status_code=400, detail="Validation Failed: Every path from Start must lead to a Finish node")

