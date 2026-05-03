import json
import os
import datetime
import logging
from typing import Dict, Any, List, Optional, Tuple
from sqlmodel import Session
from .context import FileContext
from .nodes import NODE_TYPES, StartNode, FinishNode
from ..logger import record_id_ctx
from ..db import engine
from ..models import ExecutionRecord


logger = logging.getLogger('engine')


class DagExecError(Exception):
    pass


class TaskExecutor:
    def __init__(self, dag_json: Dict[str, Any], task_cache: Dict[int, Dict[str, Any]] = None, task_id: int = None, folder_id: int = None):
        """
        Initialize the executor with a JSON representation of the DAG.
        """
        self.dag_json = dag_json
        self.task_cache = task_cache if task_cache is not None else {}
        self.task_id = task_id
        self.folder_id = folder_id
        self.nodes = {}
        self.edges = {} # source_id -> { branch_name: target_id }
        self.start_node_id = dag_json.get("start_node")
        
        self._parse_dag()

    def _parse_dag(self):
        # Instantiate nodes
        for node_id, node_data in self.dag_json.get("nodes", {}).items():
            node_type = node_data.get("type")
            if node_type in NODE_TYPES:
                node_class = NODE_TYPES[node_type]
                self.nodes[node_id] = node_class(
                    node_id=node_id,
                    name=node_data.get("name", ""),
                    config=node_data.get("config", {}),
                    task_cache=self.task_cache
                )
            else:
                logger.error(f"Unknown node type: {node_type} for node {node_id}")

        # Build edges dictionary
        self.reverse_edges = {} # target_id -> list of (source_id, branch_name)
        for edge in self.dag_json.get("edges", []):
            source = edge.get("source")
            target = edge.get("target")
            branch = edge.get("branch", "default")
            
            if source not in self.edges:
                self.edges[source] = {}
            self.edges[source][branch] = target

            if target not in self.reverse_edges:
                self.reverse_edges[target] = []
            self.reverse_edges[target].append((source, branch))

    def _build_inputs_for_node(self, node_id: str, context: FileContext) -> Dict[str, Any]:
        """Collect and merge outputs from all ancestor nodes using node_id:var_name format."""
        inputs = {}
        
        visited = set()
        ordered_ancestors = []

        def dfs(current_id):
            if current_id in visited:
                return
            visited.add(current_id)
            if current_id in self.reverse_edges:
                # Sort parents to ensure deterministic order (though not strictly required for prefixed keys)
                for parent_id, _ in sorted(self.reverse_edges[current_id]):
                    dfs(parent_id)
            if current_id != node_id:
                ordered_ancestors.append(current_id)

        dfs(node_id)

        for ancestor_id in ordered_ancestors:
            ancestor_output = context.get_node_output(ancestor_id)
            if ancestor_output:
                for var_name, var_value in ancestor_output.items():
                    inputs[f"{ancestor_id}:{var_name}"] = var_value
                
        return inputs

    def create_exec_record(self, input_path, input_size):
        with Session(engine) as session:
            record = ExecutionRecord(
                task_id=self.task_id,
                folder_id=self.folder_id,
                input_path=input_path,
                input_size=input_size,
                status="running"
            )
            session.add(record)
            session.commit()
            session.refresh(record)
            return record

    def execute_with_file(self, file_path: str, record_id: int = None) -> Any:
        """
        Execute the DAG for a given file.

        :param file_path: Path to the original file.
        :return: returned value by FinishNode
        """
        # Prepare the initial file object for the start node
        try:
            initial_file_obj = self.create_file_obj(file_path)
        except Exception as e:
            raise RuntimeError(f"Failed to get info for '{file_path}': {e}")

        logger.info(f"Starting DAG execution for file: '{file_path}'")
        inputs = {'file': initial_file_obj}

        # Insert execution record
        record = None
        if record_id is None and self.task_id is not None:
            try:
                record = self.create_exec_record(file_path, initial_file_obj["size"])
                record_id = record.id
            except Exception as e:
                logger.error(f"Failed to create execution record: {e}")

        # Execution
        success = False
        output_data = {}
        # Set record_id in contextvar for logging
        token = record_id_ctx.set(record_id)
        try:
            success, output_data = self.execute(inputs)
        except Exception as e:
            logger.error(f"Execution failed: {e}")
        finally:
            record_id_ctx.reset(token)

        # Update execution record
        if record_id is not None:
            try:
                from ..logger import log_history
                # Collect error logs from history
                logs = [i for i in log_history if i.get("record_id") == record_id and i.get("level") == "ERROR"]

                with Session(engine) as session:
                    if record is None:
                        record = session.get(ExecutionRecord, record_id)
                    record.status = "success" if success else "failed"
                    record.end_time = datetime.datetime.now()
                    record.error_message = json.dumps(logs) if logs else None

                    # Try to find output file info
                    if success and output_data:
                        # result_var in FinishNode can point to a file object
                        result = output_data.get("result")
                        if isinstance(result, dict) and "path" in result and "size" in result:
                            record.output_path = result["path"]
                            record.output_size = result["size"]
                        elif "file" in output_data and isinstance(output_data["file"], dict):
                            # Fallback if result is not set but 'file' is in output
                            record.output_path = output_data["file"].get("path")
                            record.output_size = output_data["file"].get("size")

                    session.add(record)
                    session.commit()
            except Exception as e:
                logger.error(f"Failed to update execution record: {e}")

        return success

    def create_file_obj(self, file_path: str):
        file_obj = {
            "path": file_path,
            "size": os.path.getsize(file_path) if os.path.exists(file_path) else 0,
            "ctime": os.path.getctime(file_path),
        }
        return file_obj

    def execute(self, inputs: Dict[str, Any], context: FileContext = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Execute the DAG.
        
        :param context:
        :param inputs: input to StartNode
        :return: (success, last_node_output)
        """
        if context is None:
            context = FileContext()
        current_node_id = self.start_node_id
        
        if not current_node_id:
            raise DagExecError("No start node defined in DAG.")
        start_node = self.nodes.get(current_node_id)
        assert start_node and isinstance(start_node, StartNode)
        
        output_data = {}
        try:
            while current_node_id:
                if current_node_id not in self.nodes:
                    raise DagExecError(f"Node {current_node_id} not found in node registry.")

                current_node = self.nodes[current_node_id]
                logger.info(f"--- Executing node: {current_node.name} (ID: {current_node_id}) ---")
                
                # Build inputs
                if current_node_id == self.start_node_id:
                    node_inputs = inputs
                else:
                    node_inputs = self._build_inputs_for_node(current_node_id, context)

                success, next_branch, output_data = current_node.execute(node_inputs, context)
                
                # Save output to context
                context.set_node_output(current_node_id, output_data)

                if not success:
                    logger.warning(f"DAG execution halted at node: {current_node.name} (ID: {current_node_id})")
                    # Could handle specific failure logic or fallback branches here
                    return False, output_data

                if isinstance(current_node, FinishNode):
                    current_node_id = None
                # Determine next node based on branch
                elif next_branch and current_node_id in self.edges and next_branch in self.edges[current_node_id]:
                    current_node_id = self.edges[current_node_id][next_branch]
                else:
                    # No outgoing edge for this branch, but not FinishNode
                    raise DagExecError(f"No outgoing edge for branch '{next_branch}' from node {current_node_id}")

            logger.info(f"Successfully completed DAG execution for inputs: {inputs}")
            return True, output_data
        except Exception as e:
            raise DagExecError(f"Unexpected error during DAG execution for inputs {inputs}: {e}")
        finally:
            context.cleanup()

    @staticmethod
    def preload_tasks_recursive(dag_json: Dict[str, Any], cache: Dict[int, Dict[str, Any]], session=None):
        """
        Recursively finds CallTaskNode task_ids in dag_json and loads their json_data into cache.
        """
        from sqlmodel import Session
        from ..db import engine
        from ..models import Task

        nodes = dag_json.get("nodes", {})
        for node_id, node_data in nodes.items():
            if node_data.get("type") == "CallTaskNode":
                task_id = node_data.get("config", {}).get("task_id")
                if task_id and task_id not in cache:
                    if session:
                        task = session.get(Task, task_id)
                    else:
                        with Session(engine) as new_session:
                            task = new_session.get(Task, task_id)
                    
                    if task:
                        cache[task_id] = task.json_data
                        # Recurse
                        TaskExecutor.preload_tasks_recursive(task.json_data, cache, session)
