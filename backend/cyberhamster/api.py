from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Any
from .db import get_session
from .models import Task, Folder, SystemSettings

router = APIRouter()

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
