import pytest
import os
import tempfile
from sqlmodel import Session, SQLModel, create_engine
from cyberhamster.engine.executor import TaskExecutor
from cyberhamster.models import Task
from cyberhamster.engine.nodes import CallTaskNode
from unittest.mock import MagicMock, patch

# In-memory SQLite for testing
sqlite_url = "sqlite://"
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)

@pytest.fixture
def dummy_image():
    fd, path = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.remove(path)

# Mocking nodes.engine so it uses our in-memory engine
@patch("cyberhamster.engine.nodes.engine", engine)
def test_call_task_node_execution(session, dummy_image):
    # 1. Setup a sub-task in the DB
    sub_dag = {
        "start_node": "sub_start",
        "nodes": {
            "sub_start": {"type": "StartNode", "name": "Sub Start", "config": {}},
            "sub_finish": {"type": "FinishNode", "name": "Sub Finish", "config": {"result_var": "sub_start:file"}}
        },
        "edges": [
            {"source": "sub_start", "target": "sub_finish", "branch": "default"}
        ]
    }
    sub_task = Task(id=101, name="SubTask", json_data=sub_dag)
    session.add(sub_task)
    session.commit()

    # 2. Main DAG with CallTaskNode
    main_dag = {
        "start_node": "main_start",
        "nodes": {
            "main_start": {"type": "StartNode", "name": "Main Start", "config": {}},
            "call_node": {
                "type": "CallTaskNode", 
                "name": "Call Sub", 
                "config": {"task_id": 101, "input_file_var": "main_start:file"}
            },
            "main_finish": {"type": "FinishNode", "name": "Main Finish", "config": {"result_var": "call_node:status"}}
        },
        "edges": [
            {"source": "main_start", "target": "call_node", "branch": "default"},
            {"source": "call_node", "target": "main_finish", "branch": "default"}
        ]
    }

    executor = TaskExecutor(main_dag)
    success = executor.execute_with_file(dummy_image)
    
    assert success is True

@patch("cyberhamster.engine.nodes.engine", engine)
def test_call_task_node_with_cache(session, dummy_image):
    # 1. Sub-task DAG
    sub_dag = {
        "start_node": "s",
        "nodes": {
            "s": {"type": "StartNode", "name": "S", "config": {}},
            "f": {"type": "FinishNode", "name": "F", "config": {}}
        },
        "edges": [{"source": "s", "target": "f", "branch": "default"}]
    }
    # We DON'T add it to DB initially to test cache
    
    cache = {202: sub_dag}
    
    main_dag = {
        "start_node": "m",
        "nodes": {
            "m": {"type": "StartNode", "name": "M", "config": {}},
            "c": {"type": "CallTaskNode", "name": "C", "config": {"task_id": 202}},
            "mf": {"type": "FinishNode", "name": "MF", "config": {}}
        },
        "edges": [
            {"source": "m", "target": "c", "branch": "default"},
            {"source": "c", "target": "mf", "branch": "default"}
        ]
    }

    # If it uses cache, it shouldn't hit the DB (which would fail as task 202 is missing)
    executor = TaskExecutor(main_dag, task_cache=cache)
    success = executor.execute_with_file(dummy_image)
    assert success is True

@patch("cyberhamster.engine.nodes.engine", engine)
def test_preload_tasks_recursive(session):
    sub_sub_dag = {
        "start_node": "ss",
        "nodes": {"ss": {"type": "StartNode"}, "sf": {"type": "FinishNode"}},
        "edges": [{"source": "ss", "target": "sf"}]
    }
    sub_dag = {
        "start_node": "s",
        "nodes": {
            "s": {"type": "StartNode"},
            "c": {"type": "CallTaskNode", "config": {"task_id": 303}},
            "f": {"type": "FinishNode"}
        },
        "edges": [{"source": "s", "target": "c"}, {"source": "c", "target": "f"}]
    }
    
    session.add(Task(id=303, name="SubSub", json_data=sub_sub_dag))
    session.add(Task(id=302, name="Sub", json_data=sub_dag))
    session.commit()
    
    main_tj = {
        "nodes": {
            "n1": {"type": "CallTaskNode", "config": {"task_id": 302}}
        }
    }
    
    cache = {}
    TaskExecutor.preload_tasks_recursive(main_tj, cache, session=session)
    
    assert 302 in cache
    assert 303 in cache
    assert cache[302] == sub_dag
    assert cache[303] == sub_sub_dag
