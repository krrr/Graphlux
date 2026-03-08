import os
from typing import Dict, Any, List

class FileContext:
    def __init__(self, original_file_path: str):
        """
        Initialize the context for processing a single file.
        
        :param original_file_path: The absolute or relative path to the original file.
        """
        self.original_file_path: str = original_file_path
        self.current_file_path: str = original_file_path
        self.metadata: Dict[str, Any] = {}
        self.shared_data: Dict[str, Any] = {}
        self.temp_files: List[str] = []

    def update_current_path(self, new_path: str):
        """Update the current path of the file being processed."""
        self.current_file_path = new_path

    def add_temp_file(self, temp_path: str):
        """Register a temporary file so it can be cleaned up later."""
        if temp_path not in self.temp_files:
            self.temp_files.append(temp_path)

    def set_metadata(self, key: str, value: Any):
        """Set a metadata value."""
        self.metadata[key] = value

    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Get a metadata value."""
        return self.metadata.get(key, default)

    def set_shared_data(self, key: str, value: Any):
        """Set shared data for nodes to communicate."""
        self.shared_data[key] = value

    def get_shared_data(self, key: str, default: Any = None) -> Any:
        """Get shared data."""
        return self.shared_data.get(key, default)

    def cleanup(self):
        """Clean up all registered temporary files."""
        for temp_file in self.temp_files:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except Exception as e:
                    print(f"Failed to remove temp file {temp_file}: {e}")
