import pytest
import os
import shutil
import tempfile
from unittest.mock import patch, MagicMock
from cyberhamster.engine.executor import DAGExecutor

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
    "start_node": "node_1",
    "nodes": {
        "node_1": {"type": "ReadInputNode", "name": "Read JPG", "config": {}},
        "node_2": {"type": "ConvertNode", "name": "Convert AVIF", "config": {"tool": "imagemagick", "target_extension": ".avif"}},
        "node_3": {"type": "CalculateCompressionNode", "name": "Calc Comp", "config": {}},
        "node_4": {"type": "ConditionNode", "name": "Check Threshold", "config": {"variable": "compression_ratio", "operator": "<", "threshold": 0.8}},
        "node_5": {"type": "FileOperationNode", "name": "Replace", "config": {"action": "overwrite", "target_extension": ".avif"}},
        "node_6": {"type": "FileOperationNode", "name": "Cleanup", "config": {"action": "cleanup"}},
        "node_7": {"type": "MetadataWriteNode", "name": "Write Meta", "config": {"tags": {"XMP:ProcessingStatus": "LowCompression_Skipped"}, "write_to_original": True}}
    },
    "edges": [
        {"source": "node_1", "target": "node_2", "branch": "default"},
        {"source": "node_2", "target": "node_3", "branch": "default"},
        {"source": "node_3", "target": "node_4", "branch": "default"},
        {"source": "node_4", "target": "node_5", "branch": "true_branch"},
        {"source": "node_4", "target": "node_6", "branch": "false_branch"},
        {"source": "node_6", "target": "node_7", "branch": "default"}
    ]
}

@patch('cyberhamster.tools.exiftool_wrapper.ExifToolWrapper.read_metadata')
@patch('cyberhamster.tools.imagemagick_wrapper.ImageMagickWrapper.run')
@patch('cyberhamster.tools.exiftool_wrapper.ExifToolWrapper.write_metadata')
def test_scenario_1_success_branch(mock_write_meta, mock_imagemagick_run, mock_read_meta, dummy_image):
    # Setup mocks
    mock_read_meta.return_value = {} # No skip metadata
    
    # Simulate imagemagick run: create a dummy output file that is smaller (ratio < 0.8)
    def side_effect_magick(input_file, output_file, args):
        with open(output_file, 'wb') as f:
            f.write(b"smal") # 4 bytes vs 19 bytes of original dummy_image
        return True
    mock_imagemagick_run.side_effect = side_effect_magick
    
    executor = DAGExecutor(SCENARIO_1_DAG)
    success = executor.execute(dummy_image)
    
    assert success is True
    # The true branch (node_5) should have replaced the file
    base, _ = os.path.splitext(dummy_image)
    new_dest = base + ".avif"
    assert os.path.exists(new_dest)
    
    # Cleanup
    if os.path.exists(new_dest):
        os.remove(new_dest)

@patch('cyberhamster.tools.exiftool_wrapper.ExifToolWrapper.read_metadata')
@patch('cyberhamster.tools.imagemagick_wrapper.ImageMagickWrapper.run')
@patch('cyberhamster.tools.exiftool_wrapper.ExifToolWrapper.write_metadata')
def test_scenario_1_fail_branch(mock_write_meta, mock_imagemagick_run, mock_read_meta, dummy_image):
    # Setup mocks
    mock_read_meta.return_value = {} # No skip metadata
    
    # Simulate imagemagick run: create a dummy output file that is LARGER (ratio > 0.8)
    def side_effect_magick(input_file, output_file, args):
        with open(output_file, 'wb') as f:
            f.write(b"this is a very large file to simulate bad compression") 
        return True
    mock_imagemagick_run.side_effect = side_effect_magick
    
    executor = DAGExecutor(SCENARIO_1_DAG)
    success = executor.execute(dummy_image)
    
    assert success is True
    # It should have taken the false branch and called node_7 (MetadataWriteNode)
    mock_write_meta.assert_called_once_with(dummy_image, {"XMP:ProcessingStatus": "LowCompression_Skipped"})
