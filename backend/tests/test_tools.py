import os
from graphlux.tools.pyexiv2_wrapper import Pyexiv2Wrapper

TEST_IMAGE_PATH = os.path.abspath("tests/files/file name test_呃呃呃.jpg")

def test_read_unicode_path_metadata():
    """Test reading metadata from an image file with Unicode filename."""
    metadata = Pyexiv2Wrapper.read_metadata(TEST_IMAGE_PATH)

    assert metadata is not None
    assert isinstance(metadata, dict)
    # Metadata should contain EXIF, IPTC, or XMP data (or be empty dict if no metadata)
    # The key point is it should not raise an exception and should return a dict
    assert isinstance(metadata, dict)
