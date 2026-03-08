from typing import Dict, Any, List
from .context import FileContext
from .nodes import NODE_TYPES

class DAGExecutor:
    def __init__(self, dag_json: Dict[str, Any]):
        """
        Initialize the executor with a JSON representation of the DAG.
        
        Example dag_json format:
        {
            "nodes": {
                "node_1": {"type": "ReadInputNode", "name": "Start", "config": {...}},
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
                print(f"Unknown node type: {node_type}")

        # Build edges dictionary
        for edge in self.dag_json.get("edges", []):
            source = edge.get("source")
            target = edge.get("target")
            branch = edge.get("branch", "default")
            
            if source not in self.edges:
                self.edges[source] = {}
            self.edges[source][branch] = target

    def execute(self, file_path: str) -> bool:
        """
        Execute the DAG for a given file.
        
        :param file_path: Path to the original file.
        :return: True if execution finished successfully (reached end or explicitly stopped gracefully).
        """
        context = FileContext(original_file_path=file_path)
        current_node_id = self.start_node_id
        
        try:
            while current_node_id:
                if current_node_id not in self.nodes:
                    print(f"Error: Node {current_node_id} not found.")
                    return False
                    
                current_node = self.nodes[current_node_id]
                print(f"Executing node: {current_node.name} ({current_node_id})")
                
                success, next_branch = current_node.execute(context)
                
                if not success:
                    print(f"Node execution failed or explicitly stopped at {current_node.name}.")
                    # Could handle specific failure logic or fallback branches here
                    return False
                    
                # Determine next node based on branch
                if next_branch and current_node_id in self.edges and next_branch in self.edges[current_node_id]:
                    current_node_id = self.edges[current_node_id][next_branch]
                else:
                    # No outgoing edge for this branch, execution completes
                    current_node_id = None
                    
            print(f"Successfully processed file: {file_path}")
            return True
        except Exception as e:
            print(f"Exception during DAG execution: {e}")
            return False
        finally:
            context.cleanup()
