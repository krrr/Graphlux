from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, List
import asyncio
import os

from cyberhamster.engine.executor import DAGExecutor
from cyberhamster.db import init_db, get_session
from cyberhamster.api import router as api_router
from sqlmodel import Session
from cyberhamster.task_manager import task_manager

app = FastAPI(title="CyberHamster Backend")

@app.on_event("startup")
def on_startup():
    init_db()
    task_manager.start()

@app.on_event("shutdown")
def on_shutdown():
    task_manager.stop()

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

app.include_router(api_router, prefix="/api")

class ExecutionRequest(BaseModel):
    dag: Dict[str, Any] = None
    dag_id: int = None
    file_path: str

@app.post("/api/execute")
async def execute_dag_endpoint(request: ExecutionRequest):
    """
    Endpoint to trigger DAG execution.
    """
    if not os.path.exists(request.file_path):
        return JSONResponse(status_code=400, content={"error": "File not found"})

    dag_json = request.dag
    if request.dag_id is not None:
        from cyberhamster.db import engine
        from cyberhamster.models import DAGDefinition
        with Session(engine) as session:
            dag_obj = session.get(DAGDefinition, request.dag_id)
            if not dag_obj:
                return JSONResponse(status_code=404, content={"error": "DAG not found"})
            dag_json = dag_obj.json_data

    if not dag_json:
        return JSONResponse(status_code=400, content={"error": "No DAG provided"})

    # Send a log message via websocket
    await manager.broadcast(f"Starting execution for: {request.file_path}")
    
    executor = DAGExecutor(dag_json)
    
    # Run in threadpool to not block the asyncio loop
    loop = asyncio.get_event_loop()
    success = await loop.run_in_executor(None, executor.execute, request.file_path)
    
    if success:
        await manager.broadcast(f"Successfully finished execution for: {request.file_path}")
        return {"status": "success", "message": "DAG execution completed"}
    else:
        await manager.broadcast(f"Failed execution for: {request.file_path}")
        return JSONResponse(status_code=500, content={"status": "error", "message": "DAG execution failed"})

@app.websocket("/api/logs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We keep the connection open and wait for messages from client if any
            data = await websocket.receive_text()
            # Could handle ping/pong or other client messages here
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Mount the static files for the Angular frontend
# This relies on the frontend build outputting to `frontend/dist/frontend/browser` or similar
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
# We'll create the directory structure now to avoid FastAPI startup errors, 
# but it will be populated by Angular build later.
os.makedirs(frontend_path, exist_ok=True)
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")


