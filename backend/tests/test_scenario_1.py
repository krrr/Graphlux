import pytest
import os
import shutil
import tempfile
from unittest.mock import patch, MagicMock
from cyberhamster.engine.executor import TaskExecutor

# Create a dummy image for testing
@pytest.fixture
def dummy_image():
    fd, path = tempfile.mkstemp(suffix=".jpg")
    with os.fdopen(fd, 'wb') as f:
        f.write(b"dummy image content")
    yield path
    if os.path.exists(path):
        os.remove(path)

# Scenario 1 DAG definition
SCENARIO_1_DAG = {
    "start_node": "node_0",
    "nodes": {
        "node_0": {"type": "StartNode", "name": "Start", "config": {}},
        "node_1": {"type": "MetadataReadNode", "name": "Read Metadata", "config": {"input_file_var": "node_0:file"}},
        "node_2": {"type": "ConvertNode", "name": "Convert AVIF", "config": {"input_file_var": "node_0:file", "tool": "imagemagick", "target_extension": ".avif"}},
        "node_3": {"type": "CodeEvalNode", "name": "Calc Comp", "config": {"code": "import os\nos.path.getsize(args['node_2:file']['path']) / os.path.getsize(args['node_0:file']['path'])", "output_var": "compression_ratio"}},
        "node_4": {"type": "ConditionNode", "name": "Check Threshold", "config": {"relation": "and", "conditions": [{"variable": "node_3:compression_ratio", "operator": "<", "target": "0.8"}]}},
        "node_5": {"type": "FileOperationNode", "name": "Replace", "config": {"input_file_var": "node_2:file", "action": "overwrite", "target_file_var": "node_0:file", "target_extension": ".avif"}},
        "node_6": {"type": "FileOperationNode", "name": "Cleanup", "config": {"input_file_var": "node_2:file", "action": "cleanup"}},
        "node_7": {"type": "MetadataWriteNode", "name": "Write Meta", "config": {"input_file_var": "node_0:file", "tags": {"XMP:ProcessingStatus": "LowCompression_Skipped"}}},
        "node_8": {"type": "FinishNode", "name": "Finish1", "config": {}},
        "node_9": {"type": "FinishNode", "name": "Finish2", "config": {}},
    },
    "edges": [
        {"source": "node_0", "target": "node_1", "branch": "default"},
        {"source": "node_1", "target": "node_2", "branch": "default"},
        {"source": "node_2", "target": "node_3", "branch": "default"},
        {"source": "node_3", "target": "node_4", "branch": "default"},
        {"source": "node_4", "target": "node_5", "branch": "true_branch"},
        {"source": "node_4", "target": "node_6", "branch": "false_branch"},
        {"source": "node_5", "target": "node_9", "branch": "default"},
        {"source": "node_6", "target": "node_7", "branch": "default"},
        {"source": "node_7", "target": "node_8", "branch": "default"},
    ]
}

@patch('cyberhamster.tools.pyexiv2_wrapper.Pyexiv2Wrapper.read_metadata')
@patch('cyberhamster.tools.imagemagick_wrapper.ImageMagickWrapper.run')
@patch('cyberhamster.tools.pyexiv2_wrapper.Pyexiv2Wrapper.write_metadata')
def test_scenario_1_success_branch(mock_write_meta, mock_imagemagick_run, mock_read_meta, dummy_image):
    # Setup mocks
    mock_read_meta.return_value = {} # No skip metadata
    
    # Simulate imagemagick run: create a dummy output file that is smaller (ratio < 0.8)
    def side_effect_magick(input_file, output_file, args):
        with open(output_file, 'wb') as f:
            f.write(b"smal") # 4 bytes vs 19 bytes of original dummy_image
        return True
    mock_imagemagick_run.side_effect = side_effect_magick
    
    executor = TaskExecutor(SCENARIO_1_DAG)
    executor.execute_with_file(dummy_image)
    
    # The true branch (node_5) should have replaced the file
    base, _ = os.path.splitext(dummy_image)
    new_dest = base + ".avif"
    assert os.path.exists(new_dest)
    
    # Cleanup
    if os.path.exists(new_dest):
        os.remove(new_dest)

@patch('cyberhamster.tools.pyexiv2_wrapper.Pyexiv2Wrapper.read_metadata')
@patch('cyberhamster.tools.imagemagick_wrapper.ImageMagickWrapper.run')
@patch('cyberhamster.tools.pyexiv2_wrapper.Pyexiv2Wrapper.write_metadata')
def test_scenario_1_fail_branch(mock_write_meta, mock_imagemagick_run, mock_read_meta, dummy_image):
    # Setup mocks
    mock_read_meta.return_value = {} # No skip metadata
    
    # Simulate imagemagick run: create a dummy output file that is LARGER (ratio > 0.8)
    def side_effect_magick(input_file, output_file, args):
        with open(output_file, 'wb') as f:
            f.write(b"this is a very large file to simulate bad compression") 
        return True
    mock_imagemagick_run.side_effect = side_effect_magick
    
    executor = TaskExecutor(SCENARIO_1_DAG)
    executor.execute_with_file(dummy_image)
    
    # It should have taken the false branch and called node_7 (MetadataWriteNode)
    mock_write_meta.assert_called_once_with(dummy_image, {"XMP:ProcessingStatus": "LowCompression_Skipped"})
