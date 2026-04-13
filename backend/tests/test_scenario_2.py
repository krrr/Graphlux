import pytest
import os
import tempfile
from unittest.mock import patch
from graphlux.engine.executor import TaskExecutor

@pytest.fixture
def dummy_mp4():
    fd, path = tempfile.mkstemp(suffix=".mp4")
    with os.fdopen(fd, 'wb') as f:
        f.write(b"dummy mp4 content")
    yield path
    if os.path.exists(path):
        os.remove(path)

SCENARIO_2_DAG = {
    "start_node": "node_0",
    "nodes": {
        "node_0": {"type": "StartNode", "name": "Start", "config": {}},
        "node_1": {"type": "MetadataReadNode", "name": "Read MP4", "config": {"input_file_var": "node_0:file"}},
        "node_2": {"type": "ConvertNode", "name": "Streamline Audio", "config": {
            "tool": "ffmpeg",
            "input_file_var": "node_0:file",
            "args": ["-map", "0:v", "-map", "0:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k"],
            "extension": ".mp4"
        }},
        "node_3": {"type": "FileOperationNode", "name": "Replace", "config": {
            "input_file_var": "node_2:file",
            "action": "overwrite",
            "target_file_var": "node_0:file",
        }},
        "node_4": {"type": "MetadataWriteNode", "name": "Write Meta", "config": {
            "input_file_var": "node_0:file",
            "tags": {"Processed": "True"},
        }},
        "node_5": {"type": "FinishNode", "name": "Finish", "config": {}}
    },
    "edges": [
        {"source": "node_0", "target": "node_1", "branch": "default"},
        {"source": "node_1", "target": "node_2", "branch": "default"},
        {"source": "node_2", "target": "node_3", "branch": "default"},
        {"source": "node_3", "target": "node_4", "branch": "default"},
        {"source": "node_4", "target": "node_5", "branch": "default"}
    ]
}

@patch('graphlux.tools.pyexiv2_wrapper.Pyexiv2Wrapper.read_metadata')
@patch('graphlux.tools.ffmpeg_wrapper.FFmpegWrapper.run')
@patch('graphlux.tools.pyexiv2_wrapper.Pyexiv2Wrapper.write_metadata')
def test_scenario_2_success(mock_write_meta, mock_ffmpeg_run, mock_read_meta, dummy_mp4):
    mock_read_meta.return_value = {} # Not processed yet
    
    # Simulate ffmpeg run
    def side_effect_ffmpeg(input_file, output_file, args):
        with open(output_file, 'wb') as f:
            f.write(b"ffmpeg output mp4")
        return True
    mock_ffmpeg_run.side_effect = side_effect_ffmpeg
    
    executor = TaskExecutor(SCENARIO_2_DAG)
    executor.execute_with_file(dummy_mp4)

    # Assert ffmpeg was called with correct parsed args
    expected_args = ["-map", "0:v", "-map", "0:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k"]
    mock_ffmpeg_run.assert_called_once()
    actual_args = mock_ffmpeg_run.call_args[0][2]
    assert actual_args == expected_args
    
    # Assert metadata write was called
    mock_write_meta.assert_called_once_with(dummy_mp4, {"Processed": "True"})
