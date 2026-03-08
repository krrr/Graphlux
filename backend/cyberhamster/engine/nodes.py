import os
import shutil
import tempfile
from typing import Any, Dict, Optional, Tuple, List
from .context import FileContext
from ..tools.ffmpeg_wrapper import FFmpegWrapper
from ..tools.exiftool_wrapper import ExifToolWrapper
from ..tools.imagemagick_wrapper import ImageMagickWrapper

class DAGNode:
    """Base class for a node in the execution DAG."""
    def __init__(self, node_id: str, name: str, config: Dict[str, Any] = None):
        self.node_id = node_id
        self.name = name
        self.config = config or {}
    
    def execute(self, context: FileContext) -> Tuple[bool, Optional[str]]:
        """
        Execute the node logic.
        :param context: The context of the file being processed.
        :return: A tuple of (success_boolean, next_branch_name).
                 If next_branch_name is None, the default sequence continues.
        """
        raise NotImplementedError("Subclasses must implement execute()")

class ReadInputNode(DAGNode):
    """Reads metadata, stops if already processed."""
    def execute(self, context: FileContext) -> Tuple[bool, Optional[str]]:
        file_path = context.current_file_path
        metadata = ExifToolWrapper.read_metadata(file_path)
        if metadata:
            for k, v in metadata.items():
                context.set_metadata(k, v)
        
        # Check if already processed (example logic from config)
        check_tag = self.config.get("check_tag", "XMP:ProcessingStatus")
        skip_value = self.config.get("skip_value", "Processed=True")
        
        # In actual exiftool output, nested objects or specific strings need careful parsing.
        # This is simplified for demonstration.
        if metadata and check_tag in metadata and str(metadata[check_tag]) == skip_value:
            print(f"File {file_path} already processed. Skipping.")
            return False, None # Return False to stop DAG execution
            
        return True, "default"

class ConvertNode(DAGNode):
    """Converts image format."""
    def execute(self, context: FileContext) -> Tuple[bool, Optional[str]]:
        input_file = context.current_file_path
        target_ext = self.config.get("target_extension", ".avif")
        
        # Create a temp file
        temp_fd, temp_path = tempfile.mkstemp(suffix=target_ext)
        os.close(temp_fd)
        context.add_temp_file(temp_path)
        
        # Determine tool based on config or default to ImageMagick for images
        tool = self.config.get("tool", "imagemagick")
        args = self.config.get("args", [])
        
        success = False
        if tool == "imagemagick":
            success = ImageMagickWrapper.run(input_file, temp_path, args)
        elif tool == "ffmpeg":
            success = FFmpegWrapper.run(input_file, temp_path, args)
            
        if success:
            context.update_current_path(temp_path)
            return True, "default"
        return False, None

class CalculateCompressionNode(DAGNode):
    """Calculates compression ratio."""
    def execute(self, context: FileContext) -> Tuple[bool, Optional[str]]:
        original_file = context.original_file_path
        current_file = context.current_file_path
        
        try:
            original_size = os.path.getsize(original_file)
            current_size = os.path.getsize(current_file)
            if original_size == 0:
                ratio = 1.0
            else:
                ratio = current_size / original_size
                
            context.set_shared_data("compression_ratio", ratio)
            return True, "default"
        except OSError as e:
            print(f"Error calculating sizes: {e}")
            return False, None

class ConditionNode(DAGNode):
    """Evaluates a condition and branches."""
    def execute(self, context: FileContext) -> Tuple[bool, Optional[str]]:
        var_name = self.config.get("variable")
        operator = self.config.get("operator")
        threshold = self.config.get("threshold")
        
        val = context.get_shared_data(var_name)
        if val is None:
            return False, None
            
        result = False
        if operator == "<":
            result = val < threshold
        elif operator == ">":
            result = val > threshold
        elif operator == "==":
            result = val == threshold
            
        if result:
            return True, "true_branch"
        else:
            return True, "false_branch"

class FileOperationNode(DAGNode):
    """Moves, deletes, or overwrites files."""
    def execute(self, context: FileContext) -> Tuple[bool, Optional[str]]:
        action = self.config.get("action") # "overwrite", "cleanup"
        
        if action == "overwrite":
            # Move current_file (temp) to original_file location
            # Note: might need extension change handling based on scenario
            current = context.current_file_path
            orig = context.original_file_path
            
            if current != orig:
                target_ext = self.config.get("target_extension")
                if target_ext:
                    base, _ = os.path.splitext(orig)
                    new_dest = base + target_ext
                    shutil.move(current, new_dest)
                    # if extension changed, we might want to delete the original if it's different
                    if new_dest != orig:
                        try:
                            os.remove(orig)
                        except OSError:
                            pass
                    context.update_current_path(new_dest)
                    # current file is no longer temporary
                    if current in context.temp_files:
                        context.temp_files.remove(current)
                else:
                    shutil.move(current, orig)
                    context.update_current_path(orig)
                    if current in context.temp_files:
                         context.temp_files.remove(current)
                         
        elif action == "cleanup":
             # Handled by context.cleanup() at the end, but can force here if needed
             pass
             
        return True, "default"

class MetadataWriteNode(DAGNode):
    """Writes metadata tags."""
    def execute(self, context: FileContext) -> Tuple[bool, Optional[str]]:
        tags = self.config.get("tags", {})
        target_file = context.current_file_path # could be original if we reverted
        
        # If the DAG failed/was rejected and we want to write to original
        write_to_original = self.config.get("write_to_original", False)
        if write_to_original:
            target_file = context.original_file_path
            
        success = ExifToolWrapper.write_metadata(target_file, tags)
        return success, "default"

class FFmpegActionNode(DAGNode):
    """Executes FFmpeg with specific parameters."""
    def execute(self, context: FileContext) -> Tuple[bool, Optional[str]]:
        input_file = context.current_file_path
        
        # Example format: "-map 0:v -map 0:a:0 -c:v copy -c:a aac -b:a 128k"
        args_str = self.config.get("args", "")
        import shlex
        args = shlex.split(args_str)
        
        ext = self.config.get("extension", ".mp4")
        temp_fd, temp_path = tempfile.mkstemp(suffix=ext)
        os.close(temp_fd)
        context.add_temp_file(temp_path)
        
        success = FFmpegWrapper.run(input_file, temp_path, args)
        if success:
            context.update_current_path(temp_path)
            return True, "default"
        return False, None

# A registry to instantiate nodes by type
NODE_TYPES = {
    "ReadInputNode": ReadInputNode,
    "ConvertNode": ConvertNode,
    "CalculateCompressionNode": CalculateCompressionNode,
    "ConditionNode": ConditionNode,
    "FileOperationNode": FileOperationNode,
    "MetadataWriteNode": MetadataWriteNode,
    "FFmpegActionNode": FFmpegActionNode
}
