import os
import shutil
import tempfile
import shlex
import ast
from typing import Any, Dict, Optional, Tuple, TypedDict
from .context import FileContext
from ..tools.ffmpeg_wrapper import FFmpegWrapper
from ..tools.exiftool_wrapper import ExifToolWrapper
from ..tools.imagemagick_wrapper import ImageMagickWrapper
from ..logger import logger

class FileObject(TypedDict, total=False):
    """Encapsulates a file being processed."""
    path: str
    size: int
    metadata: Dict[str, Any]


class DAGNode:
    """Base class for a node in the execution DAG."""
    def __init__(self, node_id: str, name: str, config: Dict[str, Any] = None):
        self.node_id = node_id
        self.name = name
        self.config = config or {}
    
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Execute the node logic.
        :param inputs: A dictionary of inputs gathered from upstream nodes.
        :param context: The context of the file being processed (scope manager).
        :return: A tuple of (success_boolean, next_branch_name, output_data).
                 If next_branch_name is None, the default sequence continues.
        """
        raise NotImplementedError("Subclasses must implement execute()")

class StartNode(DAGNode):
    """Start node. Passes the initial file to downstream."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        # For the start node, the input is expected to be provided by the executor directly
        file_obj = inputs.get("file")
        if not file_obj:
            logger.error(f"[{self.name}] No input file provided to StartNode.")
            return False, None, {}

        logger.info(f"[{self.name}] Starting pipeline for file: {file_obj.get('path')}")
        return True, "default", {"file": file_obj}

class FinishNode(DAGNode):
    """End node. Represents successful completion of the DAG."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        file_obj = inputs.get("file")
        if not file_obj:
            logger.warning(f"[{self.name}] Reached finish node without file object.")
        else:
            logger.info(f"[{self.name}] Successfully completed pipeline for file: {file_obj.get('path')}")
        return True, None, {"status": "success", "file": file_obj}

class MetadataReadNode(DAGNode):
    """Reads metadata, stops if already processed."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        file_obj = inputs.get("file")
        if not file_obj or "path" not in file_obj:
            logger.error(f"[{self.name}] No valid input file object provided.")
            return False, None, {}

        file_path = file_obj["path"]
        if not os.path.exists(file_path):
            logger.error(f"[{self.name}] Input file not found: {file_path}")
            return False, None, {}

        logger.info(f"[{self.name}] Reading metadata for {file_path}")
        metadata = ExifToolWrapper.read_metadata(file_path)
        if metadata is None:
            logger.error(f"[{self.name}] Failed to read metadata from {file_path}")
            return False, None, {}

        # Merge metadata into file_obj
        if "metadata" not in file_obj:
            file_obj["metadata"] = {}
        for k, v in metadata.items():
            file_obj["metadata"][k] = v
        
        # Check if already processed (example logic from config)
        check_tag = self.config.get("check_tag", "XMP:ProcessingStatus")
        skip_value = self.config.get("skip_value", "Processed=True")
        
        if check_tag in metadata and str(metadata[check_tag]) == skip_value:
            logger.info(f"[{self.name}] File {file_path} already processed (tag: {check_tag}={skip_value}). Skipping.")
            return False, None, {}
            
        return True, "default", {"file": file_obj}

class ConvertNode(DAGNode):
    """Converts image format."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        file_obj = inputs.get("file")
        if not file_obj or "path" not in file_obj:
            logger.error(f"[{self.name}] No valid input file object provided.")
            return False, None, {}

        input_file = file_obj["path"]
        if not os.path.exists(input_file):
            logger.error(f"[{self.name}] Input file not found: {input_file}")
            return False, None, {}

        target_ext = self.config.get("target_extension", ".avif")
        
        # Create a temp file
        try:
            temp_fd, temp_path = tempfile.mkstemp(suffix=target_ext)
            os.close(temp_fd)
            context.add_temp_file(temp_path)
        except OSError as e:
            logger.error(f"[{self.name}] Failed to create temporary file: {e}")
            return False, None, {}
        
        # Determine tool based on config or default to ImageMagick for images
        tool = self.config.get("tool", "imagemagick")
        args = self.config.get("args", [])
        
        logger.info(f"[{self.name}] Converting {input_file} to {temp_path} using {tool}")
        success = False
        if tool == "imagemagick":
            success = ImageMagickWrapper.run(input_file, temp_path, args)
        elif tool == "ffmpeg":
            success = FFmpegWrapper.run(input_file, temp_path, args)
        else:
            logger.error(f"[{self.name}] Unknown tool: {tool}")
            return False, None, {}
            
        if success:
            logger.info(f"[{self.name}] Conversion successful: {temp_path}")
            new_file_obj = dict(file_obj)
            new_file_obj["path"] = temp_path
            new_file_obj["size"] = os.path.getsize(temp_path)
            return True, "default", {"file": new_file_obj}
        
        logger.error(f"[{self.name}] Conversion failed for {input_file}")
        return False, None, {}

class ConditionNode(DAGNode):
    """Evaluates multiple conditions and branches."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        conditions = self.config.get("conditions", [])
        relation = self.config.get("relation", "and")
        
        if not conditions:
            logger.warning(f"[{self.name}] No conditions found, defaulting to False")
            return True, "false_branch", dict(inputs)
            
        results = []
        for cond in conditions:
            var_name = cond.get("variable")
            operator = cond.get("operator")
            threshold = cond.get("threshold")

            val = inputs.get(var_name)
            if val is None:
                logger.error(f"[{self.name}] Input data variable '{var_name}' not found. Defaulting to False for this condition.")
                results.append(False)
                continue

            res = False
            try:
                if operator == "<":
                    res = val < threshold
                elif operator == ">":
                    res = val > threshold
                elif operator == "==":
                    res = val == threshold
                else:
                    logger.error(f"[{self.name}] Unknown operator: {operator}")
            except Exception as e:
                logger.error(f"[{self.name}] Error evaluating condition {var_name} {operator} {threshold} (value={val}): {e}")

            results.append(res)
            logger.info(f"[{self.name}] Evaluated {var_name} {operator} {threshold} (value={val}) -> {res}")
            
        final_result = all(results) if relation == "and" else any(results)
        logger.info(f"[{self.name}] Final relation '{relation}' of {results} -> {final_result}")
        
        out_dict = dict(inputs)
        if final_result:
            return True, "true_branch", out_dict
        else:
            return True, "false_branch", out_dict

class FileOperationNode(DAGNode):
    """Moves, deletes, or overwrites files."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        file_obj = inputs.get("file")
        if not file_obj or "path" not in file_obj:
            logger.error(f"[{self.name}] No valid input file object provided.")
            return False, None, {}

        action = self.config.get("action") # "overwrite", "cleanup"
        
        if action == "overwrite":
            current = file_obj["path"]
            orig = context.original_file_path

            if not os.path.exists(current):
                logger.error(f"[{self.name}] Source file for overwrite not found: {current}")
                return False, None, {}
            
            if current != orig:
                target_ext = self.config.get("target_extension")
                if target_ext:
                    base, _ = os.path.splitext(orig)
                    new_dest = base + target_ext
                    logger.info(f"[{self.name}] Moving {current} to {new_dest}")
                    try:
                        shutil.move(current, new_dest)
                        # if extension changed, we might want to delete the original if it's different
                        if new_dest != orig:
                            if os.path.exists(orig):
                                logger.info(f"[{self.name}] Removing original file: {orig}")
                                os.remove(orig)
                        file_obj["path"] = new_dest
                        # current file is no longer temporary
                        if current in context.temp_files:
                            context.temp_files.remove(current)
                    except OSError as e:
                        logger.error(f"[{self.name}] Failed to move file: {e}")
                        return False, None, {}
                else:
                    logger.info(f"[{self.name}] Overwriting {orig} with {current}")
                    try:
                        shutil.move(current, orig)
                        file_obj["path"] = orig
                        if current in context.temp_files:
                             context.temp_files.remove(current)
                    except OSError as e:
                        logger.error(f"[{self.name}] Failed to overwrite file: {e}")
                        return False, None, {}
                         
        elif action == "cleanup":
             logger.info(f"[{self.name}] Explicit cleanup requested (handled by context at the end).")
             pass
        else:
            logger.error(f"[{self.name}] Unknown action: {action}")
            return False, None, {}
             
        return True, "default", {"file": file_obj}

class MetadataWriteNode(DAGNode):
    """Writes metadata tags."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        file_obj = inputs.get("file")
        if not file_obj or "path" not in file_obj:
            logger.error(f"[{self.name}] No valid input file object provided.")
            return False, None, {}

        tags = self.config.get("tags", {})
        target_file = file_obj["path"]
        
        # If the DAG failed/was rejected and we want to write to original
        write_to_original = self.config.get("write_to_original", False)
        if write_to_original:
            target_file = context.original_file_path
            
        if not os.path.exists(target_file):
            logger.error(f"[{self.name}] Target file for metadata write not found: {target_file}")
            return False, None, {}

        logger.info(f"[{self.name}] Writing tags to {target_file}: {tags}")
        success = ExifToolWrapper.write_metadata(target_file, tags)
        if success:
            return True, "default", {"file": file_obj}
        else:
            logger.error(f"[{self.name}] Failed to write metadata to {target_file}")
            return False, None, {}


class CodeEvalNode(DAGNode):
    """Evaluates Python code. Similar to a multi-line lambda, returning the last expression's result. Reads variables via args."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        code_str = self.config.get("code", "")
        output_var = self.config.get("output_var", "eval_result")

        # args dictionary for code access
        args = dict(inputs)
        # Also provide useful context
        args['original_file_path'] = context.original_file_path

        local_vars = {"args": args, "os": os}

        try:
            tree = ast.parse(code_str)
            if not tree.body:
                logger.warning(f"[{self.name}] Empty code provided.")
                return True, "default", dict(inputs)

            last_stmt = tree.body[-1]
            if isinstance(last_stmt, ast.Expr):
                # If the last statement is an expression, evaluate it
                exec_tree = ast.Module(body=tree.body[:-1], type_ignores=[])
                exec(compile(exec_tree, filename="<ast>", mode="exec"), local_vars)
                result = eval(compile(ast.Expression(body=last_stmt.value), filename="<ast>", mode="eval"), local_vars)
            else:
                # Execute everything
                exec(compile(tree, filename="<ast>", mode="exec"), local_vars)
                result = None

            logger.info(f"[{self.name}] Code evaluated successfully. Result: {result}")
            out_dict = dict(inputs)
            out_dict[output_var] = result
            return True, "default", out_dict

        except Exception as e:
            logger.error(f"[{self.name}] Code evaluation failed: {e}")
            return False, None, {}


class FFmpegActionNode(DAGNode):
    """Executes FFmpeg with specific parameters."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        file_obj = inputs.get("file")
        if not file_obj or "path" not in file_obj:
            logger.error(f"[{self.name}] No valid input file object provided.")
            return False, None, {}

        input_file = file_obj["path"]
        if not os.path.exists(input_file):
            logger.error(f"[{self.name}] Input file not found: {input_file}")
            return False, None, {}

        # Example format: "-map 0:v -map 0:a:0 -c:v copy -c:a aac -b:a 128k"
        args_str = self.config.get("args", "")
        args = shlex.split(args_str)
        
        ext = self.config.get("extension", ".mp4")
        try:
            temp_fd, temp_path = tempfile.mkstemp(suffix=ext)
            os.close(temp_fd)
            context.add_temp_file(temp_path)
        except OSError as e:
            logger.error(f"[{self.name}] Failed to create temporary file: {e}")
            return False, None, {}
        
        logger.info(f"[{self.name}] Executing FFmpeg on {input_file} -> {temp_path} with args: {args_str}")
        success = FFmpegWrapper.run(input_file, temp_path, args)
        if success:
            logger.info(f"[{self.name}] FFmpeg successful: {temp_path}")
            new_file_obj = dict(file_obj)
            new_file_obj["path"] = temp_path
            new_file_obj["size"] = os.path.getsize(temp_path)
            return True, "default", {"file": new_file_obj}
        
        logger.error(f"[{self.name}] FFmpeg execution failed for {input_file}")
        return False, None, {}


# A registry to instantiate nodes by type
NODE_TYPES = { i.__name__: i for i in (
    StartNode, FinishNode, MetadataReadNode, ConvertNode, CodeEvalNode, ConditionNode, FileOperationNode,
    MetadataWriteNode, FFmpegActionNode)
}
