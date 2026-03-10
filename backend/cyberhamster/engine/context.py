import os
from typing import Dict, Any, List
from ..logger import logger

class FileContext:
    def __init__(self, original_file_path: str):
        """
        Initialize the context for processing a single file.
        
        :param original_file_path: The absolute or relative path to the original file.
        """
        self.original_file_path: str = original_file_path
        self.temp_files: List[str] = []
        self.outputs: Dict[str, Dict[str, Any]] = {}

    def add_temp_file(self, temp_path: str):
        """Register a temporary file so it can be cleaned up later."""
        if temp_path not in self.temp_files:
            self.temp_files.append(temp_path)

    def set_node_output(self, node_id: str, output: Dict[str, Any]):
        """Record the output data from a node's execution."""
        self.outputs[node_id] = output

    def get_node_output(self, node_id: str) -> Dict[str, Any]:
        """Retrieve the output data of a previously executed node."""
        return self.outputs.get(node_id, {})

    def cleanup(self):
        """Clean up all registered temporary files."""
        for temp_file in self.temp_files:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except Exception as e:
                    logger.error(f"Failed to remove temp file {temp_file}: {e}")
