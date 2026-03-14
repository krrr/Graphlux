import os
from typing import Dict, Any, List
from .context import FileContext
from .nodes import NODE_TYPES
from ..logger import logger

class TaskExecutor:
    def __init__(self, dag_json: Dict[str, Any]):
        """
        Initialize the executor with a JSON representation of the DAG.
        
        Example dag_json format:
        {
            "nodes": {
                "node_1": {"type": "MetadataReadNode", "name": "Start", "config": {...}},
                "node_2": {"type": "ConvertNode", "name": "Convert to AVIF", "config": {...}}
            },
            "edges": [
                {"source": "node_1", "target": "node_2", "branch": "default"}
            ],
            "start_node": "node_1"
        }
        """
        self.dag_json = dag_json
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
                    config=node_data.get("config", {})
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
        """Collect and merge outputs from all upstream nodes."""
        inputs = {}
        if node_id in self.reverse_edges:
            for source_id, branch in self.reverse_edges[node_id]:
                source_output = context.get_node_output(source_id)
                # Merge outputs, later edges might overwrite earlier ones if keys clash
                inputs.update(source_output)
        return inputs

    def execute(self, file_path: str) -> bool:
        """
        Execute the DAG for a given file.
        
        :param file_path: Path to the original file.
        :return: True if execution finished successfully (reached end or explicitly stopped gracefully).
        """
        logger.info(f"Starting DAG execution for file: {file_path}")
        context = FileContext(original_file_path=file_path)
        current_node_id = self.start_node_id
        
        if not current_node_id:
            logger.error("No start node defined in DAG.")
            return False
        
        # Prepare the initial file object for the start node
        try:
            initial_file_obj = {
                "path": file_path,
                "size": os.path.getsize(file_path) if os.path.exists(file_path) else 0,
                "metadata": {}
            }
        except Exception as e:
            logger.error(f"Failed to get info for {file_path}: {e}")
            return False

        try:
            while current_node_id:
                if current_node_id not in self.nodes:
                    logger.error(f"Node {current_node_id} not found in node registry.")
                    return False
                    
                current_node = self.nodes[current_node_id]
                logger.info(f"--- Executing node: {current_node.name} (ID: {current_node_id}) ---")
                
                # Build inputs
                if current_node_id == self.start_node_id:
                    node_inputs = {"file": initial_file_obj}
                else:
                    node_inputs = self._build_inputs_for_node(current_node_id, context)

                success, next_branch, output_data = current_node.execute(node_inputs, context)
                
                # Save output to context
                context.set_node_output(current_node_id, output_data)

                if not success:
                    logger.warning(f"DAG execution halted at node: {current_node.name} (ID: {current_node_id})")
                    # Could handle specific failure logic or fallback branches here
                    return False
                    
                # Determine next node based on branch
                if next_branch and current_node_id in self.edges and next_branch in self.edges[current_node_id]:
                    current_node_id = self.edges[current_node_id][next_branch]
                else:
                    # No outgoing edge for this branch, execution completes
                    logger.info(f"No outgoing edge for branch '{next_branch}' from node {current_node_id}. Execution finished.")
                    current_node_id = None
                    
            logger.info(f"Successfully completed DAG execution for file: {file_path}")
            return True
        except Exception as e:
            logger.exception(f"Unexpected error during DAG execution for {file_path}: {e}")
            return False
        finally:
            context.cleanup()
