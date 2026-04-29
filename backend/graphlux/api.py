import os
import sys
import ctypes
import asyncio
import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import selectinload, defer
from sqlmodel import delete, Session, select
from typing import List, Any, Dict, Optional
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from .db import get_session
from .models import Task, Folder, SystemSettings, FolderTaskLink, SettingsResponse, SettingsConfig, ExecutionRecord
from .engine.executor import TaskExecutor

router = APIRouter()

__version__ = "0.1.0"

def is_packaged() -> bool:
    # Nuitka sets __compiled__
    return "__compiled__" in globals() or getattr(sys, "frozen", False)

class AppInfo(BaseModel):
    version: str
    is_packaged: bool

@router.get("/info", response_model=AppInfo)
def get_app_info():
    return AppInfo(version=__version__, is_packaged=is_packaged())

def update_autostart_registry(enable: bool):
    import winreg
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0,
            winreg.KEY_SET_VALUE
        )
        if enable:
            # We assume sys.argv[0] is the correct path to the executable when packaged
            executable_path = sys.executable if getattr(sys, "frozen", False) else sys.argv[0]
            winreg.SetValueEx(key, "Graphlux", 0, winreg.REG_SZ, f'"{executable_path}"')
        else:
            try:
                winreg.DeleteValue(key, "Graphlux")
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
    except Exception as e:
        print(f"Failed to update registry: {e}")

class ExecutionRequest(BaseModel):
    task: Dict[str, Any] = None
    task_id: int = None
    file_path: str

# Schema for Folder API
class FolderCreate(BaseModel):
    folder: Folder
    task_ids: Optional[List[int]] = None


@router.post("/execute")
async def execute_task_endpoint(request: ExecutionRequest):
    """
    Endpoint to trigger Task execution.
    """
    if not os.path.exists(request.file_path):
        return JSONResponse(status_code=400, content={"error": "File not found"})

    task_json = request.task
    if request.task_id is not None:
        from graphlux.db import engine
        from graphlux.models import Task
        with Session(engine) as session:
            task_obj = session.get(Task, request.task_id)
            if not task_obj:
                return JSONResponse(status_code=404, content={"error": "Task not found"})
            task_json = task_obj.json_data

    if not task_json:
        return JSONResponse(status_code=400, content={"error": "No Task provided"})

    # Send a log message via websocket
    await manager.broadcast(f"Starting execution for: {request.file_path}")

    executor = TaskExecutor(task_json, task_id=request.task_id)

    # Run in threadpool to not block the asyncio loop
    loop = asyncio.get_event_loop()
    success = await loop.run_in_executor(None, executor.execute_with_file, request.file_path)

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

    async def broadcast(self, message: Any):
        for i in self.active_connections:
            try:
                await i.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

async def log_broadcaster():
    """Background task to broadcast structured logs from the queue to websocket clients."""
    from .logger import log_queue
    loop = asyncio.get_event_loop()
    while True:
        try:
            # Non-blocking get from thread-safe queue
            msg = await loop.run_in_executor(None, log_queue.get)
            if msg is None: # Sentinel to stop
                break
            await manager.broadcast(msg)
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(1) # Wait a bit on error

@router.get("/logs/history")
async def get_log_history():
    """Retrieve the buffered log history."""
    from .logger import log_history
    return list(log_history)

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

@router.get("/tasks")
def get_tasks(session: Session = Depends(get_session)):
    tasks = session.exec(select(Task).options(defer(Task.json_data), selectinload(Task.folders))).all()
    # 不用fastapi推荐的定义专用response_model的啰嗦写法
    return [{**i.model_dump(), "folders": [f.model_dump(include=['name']) for f in i.folders]} for i in tasks]

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
        if key not in ('id', 'created_at', 'updated_at'): # Don't update ID
            setattr(task, key, value)
    task.updated_at = datetime.datetime.now()

    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Check if there are folders using this Task via Link table
    link = session.exec(select(FolderTaskLink).where(FolderTaskLink.task_id == task_id)).first()
    if link:
        raise HTTPException(status_code=400, detail="Cannot delete Task. It is used by existing folders.")

    session.delete(task)
    session.commit()
    return {"message": "Task deleted successfully"}

# --- Folder ---

@router.get("/folders")
def get_folders(session: Session = Depends(get_session)):
    folders = session.exec(select(Folder).options(selectinload(Folder.tasks))).all()
    return [{**i.model_dump(), "tasks": [t.model_dump(include=['id', 'name']) for t in i.tasks]} for i in folders]

@router.post("/folders", response_model=Folder)
def create_folder(req: FolderCreate, session: Session = Depends(get_session)):
    folder = req.folder
    folder.id = None # Ensure it's a new record
    
    if req.task_ids:
        tasks = session.exec(select(Task).where(Task.id.in_(req.task_ids))).all()
        if len(tasks) != len(req.task_ids):
             raise HTTPException(status_code=400, detail="One or more Task IDs are invalid")
        folder.tasks = tasks

    session.add(folder)
    session.commit()
    session.refresh(folder)

    # Notify task manager
    from .task_manager import task_manager
    task_manager.add_folder(folder)

    return folder

@router.put("/folders/{folder_id}", response_model=Folder)
def update_folder(folder_id: int, req: FolderCreate, session: Session = Depends(get_session)):
    folder = session.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    old_folder_path = folder.watch_folder
    
    update_data = req.folder.model_dump(exclude_unset=True, exclude={"id", "created_at"})
    for key, value in update_data.items():
        setattr(folder, key, value)

    if req.task_ids is not None:
        tasks = session.exec(select(Task).where(Task.id.in_(req.task_ids))).all()
        if len(tasks) != len(req.task_ids):
             raise HTTPException(status_code=400, detail="One or more Task IDs are invalid")
        folder.tasks = tasks

    session.add(folder)
    session.commit()
    session.refresh(folder)

    from .task_manager import task_manager
    task_manager.update_folder(folder, old_folder_path)

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

@router.get("/settings", response_model=SettingsResponse)
def get_settings(session: Session = Depends(get_session)):
    settings = session.get(SystemSettings, 1)
    if not settings:
        settings = SystemSettings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings.to_dict()

@router.put("/settings", response_model=SettingsResponse)
def update_settings(settings_update: SettingsConfig, session: Session = Depends(get_session)):
    settings = session.get(SystemSettings, 1)
    if not settings:
        settings = SystemSettings(id=1)

    update_data = settings_update.model_dump(exclude_unset=True)
    
    # Check if auto_start changed
    if is_packaged() and "auto_start" in update_data and update_data["auto_start"] != settings.auto_start:
        update_autostart_registry(update_data["auto_start"])

    for key, value in update_data.items():
        setattr(settings, key, value)

    session.add(settings)
    session.commit()
    session.refresh(settings)
    
    return settings.to_dict()


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

# --- Execution Records ---

@router.get("/history")
def get_history(
    task_id: Optional[int] = None,
    folder_id: Optional[int] = None,
    size_mode: Optional[str] = None, # decreased, increased, unchanged
    page: int = 1,
    page_size: int = 20,
    session: Session = Depends(get_session)
):
    statement = select(ExecutionRecord).order_by(ExecutionRecord.start_time.desc())
    
    if task_id:
        statement = statement.where(ExecutionRecord.task_id == task_id)
    if folder_id:
        statement = statement.where(ExecutionRecord.folder_id == folder_id)
    
    if size_mode:
        if size_mode == 'decreased':
            statement = statement.where(ExecutionRecord.output_size != None, ExecutionRecord.output_size < ExecutionRecord.input_size)
        elif size_mode == 'increased':
            statement = statement.where(ExecutionRecord.output_size != None, ExecutionRecord.output_size > ExecutionRecord.input_size)
        elif size_mode == 'none':
            statement = statement.where(ExecutionRecord.output_size == None)
    
    # Total count
    # Use func.count for efficiency in real apps, but here we follow existing pattern for simplicity
    all_matching = session.exec(statement).all()
    total = len(all_matching)
    
    # Pagination
    statement = statement.offset((page - 1) * page_size).limit(page_size)
    records = session.exec(statement).all()
    
    return {
        "total": total,
        "items": [r.model_dump() for r in records]
    }

@router.delete("/history")
def clear_history(session: Session = Depends(get_session)):
    session.exec(delete(ExecutionRecord))
    session.commit()
    return {"message": "History cleared successfully"}

