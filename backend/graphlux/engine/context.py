import os
import logging
from typing import Dict, Any, List, Optional


logger = logging.getLogger('engine')


class FileContext:
    def __init__(self, record_id: int = None):
        """
        Initialize the context for processing a single file.
        """
        self.record_id = record_id
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


class NodeInputs:
    """
    A class that manages node inputs and supports dot notation for nested access.
    e.g. inputs.get("node_id:var.property")
    """
    def __init__(self, initial_data: Optional[Dict[str, Any]] = None):
        self._data = dict(initial_data) if initial_data else {}

    def __getitem__(self, key: str) -> Any:
        if key in self._data:
            return self._data[key]
        
        if "." in key:
            parts = key.split(".")
            base_key = parts[0]
            if base_key in self._data:
                val = self._data[base_key]
                for part in parts[1:]:
                    if isinstance(val, dict):
                        if part in val:
                            val = val[part]
                        else:
                            raise KeyError(f"Property '{part}' not found in nested path '{key}'")
                    else:
                        raise KeyError(f"Path '{key}' failed: '{part}' is not a dictionary")
                return val
        
        raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        try:
            return self[key]
        except KeyError:
            return default

    def __setitem__(self, key: str, value: Any):
        self._data[key] = value

    def __contains__(self, key: str) -> bool:
        try:
            self[key]
            return True
        except KeyError:
            return False

    def items(self):
        return self._data.items()

    def to_dict(self) -> Dict[str, Any]:
        return dict(self._data)

    def __repr__(self):
        return f"NodeInputs({self._data!r})"
