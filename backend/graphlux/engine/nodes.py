import os
import shutil
import tempfile
import ast
import send2trash
from typing import Any, Dict, Optional, Tuple, TypedDict
from sqlmodel import Session
from .context import FileContext
from ..tools.ffmpeg_wrapper import FFmpegWrapper
from ..tools.pyexiv2_wrapper import Pyexiv2Wrapper
from ..tools.imagemagick_wrapper import ImageMagickWrapper
from ..logger import logger
from ..db import engine
from ..models import Task

class FileObject(TypedDict, total=False):
    """Encapsulates a file being processed."""
    path: str
    size: int
    metadata: Dict[str, Any]


class DAGNode:
    """Base class for a node in the execution DAG."""
    def __init__(self, node_id: str, name: str, config: Dict[str, Any] = None, task_cache: Dict[int, Dict[str, Any]] = None):
        self.node_id = node_id
        self.name = name
        self.config = config or {}
        self.task_cache = task_cache
    
    def get_input_file(self, inputs: Dict[str, Any]) -> Optional[FileObject]:
        """Helper to get the input file object based on config or default."""
        input_var = self.config.get("input_file_var")
        if input_var:
            return inputs.get(input_var)
        
        # Fallback: if there's only one variable ending with ':file', use it.
        # This helps with transitions or simple chains.
        file_vars = [v for k, v in inputs.items() if k.split(':')[-1] == 'file']
        if len(file_vars) == 1:
            return file_vars[0]
        
        # Last resort for StartNode or manual injections
        return inputs.get("file")

    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Execute the node logic.
        :param inputs: A dictionary of inputs gathered from upstream nodes.
        :param context: The context of the file being processed (scope manager).
        :return: A tuple of (success_boolean, next_branch_name, output_data).
                 If next_branch_name is None, the default sequence continues.
        """
        raise NotImplementedError("Subclasses must implement execute()")

    def get_config_value_required(self, key: str):
        value = self.config.get(key)
        if value is None:
            raise Exception('config missing: ' + key)
        return value

class StartNode(DAGNode):
    """Start node. Passes the initial file to downstream."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        # For the start node, the input is provided directly by the executor as "file"
        file_obj = inputs.get("file")
        if not file_obj:
            logger.error(f"[{self.name}] No input file provided to StartNode.")
            return False, None, {}

        return True, "default", {"file": file_obj}


class FinishNode(DAGNode):
    """End node. Represents successful completion of the DAG."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        result = None
        result_var = self.config.get("result_var")
        if not result_var:
            logger.info(f"[{self.name}] Successfully completed pipeline.")
        else:
            result = inputs.get(result_var)
            logger.info(f"[{self.name}] Successfully completed pipeline with result: {result}")
        return True, None, {"status": "success", "result": result}


class MetadataReadNode(DAGNode):
    """Reads metadata, stops if already processed."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        file_obj = self.get_input_file(inputs)
        if not file_obj or "path" not in file_obj:
            logger.error(f"[{self.name}] No valid input file object provided.")
            return False, None, {}

        file_path = file_obj["path"]
        if not os.path.exists(file_path):
            logger.error(f"[{self.name}] Input file not found: '{file_path}'")
            return False, None, {}

        logger.info(f"[{self.name}] Reading metadata for '{file_path}'")
        metadata = Pyexiv2Wrapper.read_metadata(file_path)
        if metadata is None:
            logger.warning(f"[{self.name}] Failed to read metadata from '{file_path}'")
            return True, "default", {"metadata": None}

        enable_single_tag = self.config.get("enable_single_tag", False)
        
        if enable_single_tag:
            read_single_tag = self.config.get("read_single_tag")
            return True, "default", {"metadata": metadata.get(read_single_tag)}
        else:
            return True, "default", {"metadata": metadata}

class ConvertNode(DAGNode):
    """Converts image format."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        file_obj = self.get_input_file(inputs)
        if not file_obj or "path" not in file_obj:
            logger.error(f"[{self.name}] No valid input file object provided.")
            return False, None, {}

        input_file = file_obj["path"]
        if not os.path.exists(input_file):
            logger.error(f"[{self.name}] Input file not found: '{input_file}'")
            return False, None, {}

        target_ext = self.config.get("target_extension", ".avif")
        if not target_ext.startswith('.'):
            target_ext = '.' + target_ext

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
        
        logger.info(f"[{self.name}] Converting '{input_file}' to '{temp_path}' using {tool}")
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
            target = cond.get("target")

            val = inputs.get(var_name)
            if var_name not in inputs:
                logger.error(f"[{self.name}] Input data variable '{var_name}' not found. Defaulting to False for this condition.")
                results.append(False)
                continue

            # Smart coercion: try to convert target to match val's type
            if target is not None:
                try:
                    if isinstance(val, bool):
                        if isinstance(target, str):
                            target = target.lower() in ('true', '1', 't', 'y', 'yes')
                    elif isinstance(val, int):
                        target = int(float(target)) # Handle cases like "1.0" -> 1
                    elif isinstance(val, float):
                        target = float(target)
                except (ValueError, TypeError):
                    logger.warning(f"[{self.name}] Failed to coerce target '{target}' to {type(val).__name__}, using original value.")

            res = False
            try:
                if operator == "<":
                    res = val < target
                elif operator == ">":
                    res = val > target
                elif operator == "==":
                    res = val == target
                else:
                    logger.error(f"[{self.name}] Unknown operator: {operator}")
            except Exception as e:
                logger.error(f"[{self.name}] Error evaluating condition {var_name} {operator} {target} (value={val}, type={type(val).__name__}): {e}")

            results.append(res)
            logger.info(f"[{self.name}] Evaluated {var_name} {operator} {target} (value={val}) -> {res}")
            
        final_result = all(results) if relation == "and" else any(results)
        logger.info(f"[{self.name}] Final relation '{relation}' of {results} -> {final_result}")
        
        if final_result:
            return True, "true_branch", {}
        else:
            return True, "false_branch", {}

class FileOperationNode(DAGNode):
    """Moves, deletes, or overwrites files."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        # Source file (the one we are moving/using)
        file_obj = self.get_input_file(inputs)
        if not file_obj or "path" not in file_obj:
            logger.error(f"[{self.name}] No valid input file object provided.")
            return False, None, {}

        action = self.config.get("action") # "overwrite", "cleanup"
        
        if action == "overwrite":
            # Destination file (the one we are replacing)
            target_var = self.get_config_value_required("target_file_var")
            target_obj = inputs.get(target_var) if target_var else None
            
            if not target_obj or "path" not in target_obj:
                logger.error(f"[{self.name}] No valid target file object found in variable '{target_var}'.")
                return False, None, {}

            current = file_obj["path"]
            dest_path = target_obj["path"]

            if not os.path.exists(current):
                logger.error(f"[{self.name}] Source file for overwrite not found: {current}")
                return False, None, {}
            
            if current != dest_path:
                target_ext = self.config.get("target_extension")
                if target_ext:
                    # If extension change is requested, we change the destination's extension
                    base, _ = os.path.splitext(dest_path)
                    new_dest = base + (target_ext if target_ext.startswith('.') else '.' + target_ext)
                    logger.info(f"[{self.name}] Moving {current} to {new_dest}")
                    try:
                        shutil.move(current, new_dest)
                        # If destination path actually changed, remove the old one
                        if new_dest != dest_path and os.path.exists(dest_path):
                            logger.info(f"[{self.name}] Moving old target file to recycle bin: {dest_path}")
                            send2trash.send2trash(dest_path)
                        
                        # Update the path in the input object for downstream nodes
                        file_obj["path"] = new_dest
                    except OSError as e:
                        logger.error(f"[{self.name}] Failed to move file: {e}")
                        return False, None, {}
                else:
                    logger.info(f"[{self.name}] Overwriting {dest_path} with {current}")
                    try:
                        if os.path.exists(dest_path):
                            logger.info(f"[{self.name}] Moving existing target file to recycle bin: {dest_path}")
                            send2trash.send2trash(dest_path)
                        shutil.move(current, dest_path)
                        file_obj["path"] = dest_path
                    except OSError as e:
                        logger.error(f"[{self.name}] Failed to overwrite file: {e}")
                        return False, None, {}
                
                # If the source was a temporary file, it's no longer temporary (it's now the result)
                if current in context.temp_files:
                    context.temp_files.remove(current)
                         
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
        # Free choice of target file from variables
        target_var = self.config.get("target_file_var")
        file_obj = inputs.get(target_var) if target_var else self.get_input_file(inputs)

        if not file_obj or "path" not in file_obj:
            logger.error(f"[{self.name}] No valid target file object provided.")
            return False, None, {}

        tags = self.config.get("tags", {})
        target_file = file_obj["path"]
            
        if not os.path.exists(target_file):
            logger.error(f"[{self.name}] Target file for metadata write not found: '{target_file}'")
            return False, None, {}

        logger.info(f"[{self.name}] Writing tags to '{target_file}': {tags}")
        success = Pyexiv2Wrapper.write_metadata(target_file, tags)
        if success:
            return True, "default", {"file": file_obj}
        else:
            logger.error(f"[{self.name}] Failed to write metadata to '{target_file}'")
            return False, None, {}


class CodeEvalNode(DAGNode):
    """Evaluates Python code. Similar to a multi-line lambda, returning the last expression's result. Reads variables via args."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        code_str = self.config.get("code", "")
        output_var = self.config.get("output_var", "eval_result")

        # args dictionary for code access. Now contains prefixed variables!
        args = dict(inputs)

        local_vars = {"args": args, "os": os}

        try:
            tree = ast.parse(code_str)
            if not tree.body:
                logger.warning(f"[{self.name}] Empty code provided.")
                return True, "default", {}

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
            return True, "default", {output_var: result}

        except Exception as e:
            logger.error(f"[{self.name}] Code evaluation failed: {e}")
            return False, None, {}


class CallTaskNode(DAGNode):
    """Executes another task as a sub-DAG."""
    def execute(self, inputs: Dict[str, Any], context: FileContext) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        task_id = self.config.get("task_id")
        if not task_id:
            logger.error(f"[{self.name}] No task_id configured.")
            return False, None, {}

        # 1. Try to get from cache
        if self.task_cache is not None and task_id in self.task_cache:
            dag_json = self.task_cache[task_id]
            task_name = f"Task {task_id}" # Fallback name
        else:
            # 2. Fallback to database
            with Session(engine) as session:
                task = session.get(Task, task_id)
                if not task:
                    logger.error(f"[{self.name}] Task {task_id} not found.")
                    return False, None, {}
                dag_json = task.json_data
                task_name = task.name
                # Update cache if available
                if self.task_cache is not None:
                    self.task_cache[task_id] = dag_json

        from .executor import TaskExecutor
        executor = TaskExecutor(dag_json, task_cache=self.task_cache)

        # Determine the primary file path
        file_obj = self.get_input_file(inputs)
        file_path = file_obj.get("path", "") if file_obj else ""

        logger.info(f"[{self.name}] Calling subtask {task_id} ('{task_name}') for file: {file_path}")
        inputs = {'file': file_obj}
        success, output_data = executor.execute(inputs=inputs, context=context)

        if success:
            logger.info(f"[{self.name}] Subtask {task_id} completed successfully.")
            return True, "default", output_data
        else:
            logger.error(f"[{self.name}] Subtask {task_id} failed.")
            return False, None, {}


# A registry to instantiate nodes by type
NODE_TYPES = { i.__name__: i for i in (
    StartNode, FinishNode, MetadataReadNode, ConvertNode, CodeEvalNode, ConditionNode, FileOperationNode,
    MetadataWriteNode, CallTaskNode)
}
