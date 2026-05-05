import os
import pytest
from sqlmodel import Session, select
from graphlux.db import engine, init_db
from graphlux.engine import SIGNAL_VAR_SKIP
from graphlux.models import Task, ExecutionRecord
from graphlux.engine.executor import TaskExecutor

@pytest.fixture
def session():
    init_db()
    with Session(engine) as session:
        yield session

def test_finish_node_skip(session):
    # 1. Setup a simple DAG with Skip
    dag_json = {
        "start_node": "start",
        "nodes": {
            "start": {"type": "StartNode", "name": "Start"},
            "finish": {
                "type": "FinishNode", 
                "name": "Finish", 
                "config": {"result_var": SIGNAL_VAR_SKIP}
            }
        },
        "edges": [
            {"source": "start", "target": "finish"}
        ]
    }
    
    # Create a task in DB
    task = Task(name="Skip Test", json_data=dag_json)
    session.add(task)
    session.commit()
    session.refresh(task)
    
    # 2. Execute
    dummy_file = os.path.join(os.path.dirname(__file__), "files", "test.jpg")
    executor = TaskExecutor(dag_json, task_id=task.id)
    
    # Before execution, no records
    records_before = session.exec(select(ExecutionRecord).where(ExecutionRecord.task_id == task.id)).all()
    assert len(records_before) == 0
    
    success = executor.execute_with_file(dummy_file)
    assert success is True
    
    # 3. Verify record was created then deleted
    records_after = session.exec(select(ExecutionRecord).where(ExecutionRecord.task_id == task.id)).all()
    assert len(records_after) == 0

def test_code_eval_skip(session):
    # 1. Setup a DAG where CodeEval returns SKIP_EXECUTION
    dag_json = {
        "start_node": "start",
        "nodes": {
            "start": {"type": "StartNode", "name": "Start"},
            "eval": {
                "type": "CodeEvalNode",
                "name": "Eval",
                "config": {
                    "code": "SKIP_EXECUTION",
                    "output_var": "res"
                }
            },
            "finish": {
                "type": "FinishNode", 
                "name": "Finish", 
                "config": {"result_var": "eval:res"}
            }
        },
        "edges": [
            {"source": "start", "target": "eval"},
            {"source": "eval", "target": "finish"}
        ]
    }
    
    # Create a task in DB
    task = Task(name="Code Eval Skip Test", json_data=dag_json)
    session.add(task)
    session.commit()
    session.refresh(task)
    
    # 2. Execute
    dummy_file = os.path.join(os.path.dirname(__file__), "files", "test.jpg")
    executor = TaskExecutor(dag_json, task_id=task.id)
    
    success = executor.execute_with_file(dummy_file)
    assert success is True
    
    # 3. Verify record was deleted
    records_after = session.exec(select(ExecutionRecord).where(ExecutionRecord.task_id == task.id)).all()
    assert len(records_after) == 0
