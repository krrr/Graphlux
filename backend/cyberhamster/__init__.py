from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import asyncio
import os

from cyberhamster.db import init_db, get_session
from cyberhamster.api import router as api_router
from cyberhamster.task_manager import task_manager
from cyberhamster.tools.imagemagick_wrapper import magick_pool_reaper

app = FastAPI(title="CyberHamster Backend")

@app.on_event("startup")
def on_startup():
    init_db()
    task_manager.start()
    asyncio.create_task(magick_pool_reaper())

@app.on_event("shutdown")
def on_shutdown():
    task_manager.stop()


app.include_router(api_router, prefix='/api')


# Mount the static files for the Angular frontend
# This relies on the frontend build outputting to `frontend/dist/frontend/browser` or similar
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
# We'll create the directory structure now to avoid FastAPI startup errors, 
# but it will be populated by Angular build later.
os.makedirs(frontend_path, exist_ok=True)
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")

