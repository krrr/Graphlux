from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Any
from .db import get_session
from .models import DAGDefinition, Task, SystemSettings

router = APIRouter()

# --- DAGDefinition ---

@router.get("/dags", response_model=List[DAGDefinition])
def get_dags(session: Session = Depends(get_session)):
    return session.exec(select(DAGDefinition)).all()

@router.get("/dags/{dag_id}", response_model=DAGDefinition)
def get_dag(dag_id: int, session: Session = Depends(get_session)):
    dag = session.get(DAGDefinition, dag_id)
    if not dag:
        raise HTTPException(status_code=404, detail="DAG not found")
    return dag

@router.post("/dags", response_model=DAGDefinition)
def create_dag(dag: DAGDefinition, session: Session = Depends(get_session)):
    session.add(dag)
    session.commit()
    session.refresh(dag)
    return dag

@router.put("/dags/{dag_id}", response_model=DAGDefinition)
def update_dag(dag_id: int, dag_update: DAGDefinition, session: Session = Depends(get_session)):
    dag = session.get(DAGDefinition, dag_id)
    if not dag:
        raise HTTPException(status_code=404, detail="DAG not found")

    update_data = dag_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key != "id": # Don't update ID
            setattr(dag, key, value)

    session.add(dag)
    session.commit()
    session.refresh(dag)
    return dag

@router.delete("/dags/{dag_id}")
def delete_dag(dag_id: int, session: Session = Depends(get_session)):
    dag = session.get(DAGDefinition, dag_id)
    if not dag:
        raise HTTPException(status_code=404, detail="DAG not found")

    # Check if there are tasks using this DAG
    tasks = session.exec(select(Task).where(Task.dag_id == dag_id)).all()
    if tasks:
        raise HTTPException(status_code=400, detail="Cannot delete DAG. It is used by existing tasks.")

    session.delete(dag)
    session.commit()
    return {"message": "DAG deleted successfully"}

# --- Task ---

@router.get("/tasks", response_model=List[Task])
def get_tasks(session: Session = Depends(get_session)):
    return session.exec(select(Task)).all()

@router.post("/tasks", response_model=Task)
def create_task(task: Task, session: Session = Depends(get_session)):
    # Verify DAG exists
    dag = session.get(DAGDefinition, task.dag_id)
    if not dag:
        raise HTTPException(status_code=400, detail="Invalid DAG ID")

    session.add(task)
    session.commit()
    session.refresh(task)

    # Notify task manager
    from .task_manager import task_manager
    task_manager.add_task(task)

    return task

@router.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task_update: Task, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)

    # Check if DAG exists if updating DAG ID
    if "dag_id" in update_data and update_data["dag_id"] != task.dag_id:
        dag = session.get(DAGDefinition, update_data["dag_id"])
        if not dag:
            raise HTTPException(status_code=400, detail="Invalid DAG ID")

    # If watch_folder changed or status changed, we need to update the task manager
    needs_manager_update = False
    old_folder = task.watch_folder

    for key, value in update_data.items():
        if key != "id":
            if key in ("watch_folder", "status", "dag_id") and getattr(task, key) != value:
                needs_manager_update = True
            setattr(task, key, value)

    session.add(task)
    session.commit()
    session.refresh(task)

    if needs_manager_update:
        from .task_manager import task_manager
        task_manager.update_task(task, old_folder)

    return task

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    session.delete(task)
    session.commit()

    from .task_manager import task_manager
    task_manager.remove_task(task)

    return {"message": "Task deleted successfully"}

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
