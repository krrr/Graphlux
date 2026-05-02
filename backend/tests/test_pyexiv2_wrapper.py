import os
from graphlux.tools.pyexiv2_wrapper import Pyexiv2Wrapper

TEST_IMAGE_PATH = os.path.abspath("D:\轨子\yande.re 1157932 atdan feet garter honkai _star_rail japanese_clothes no_bra sparkle_(honkai _star_rail) tattoo.jpg")

def test_read_metadata():
    """Test reading metadata from an image file with Unicode filename."""
    metadata = Pyexiv2Wrapper.read_metadata(TEST_IMAGE_PATH)

    assert metadata is not None
    assert isinstance(metadata, dict)
    # Metadata should contain EXIF, IPTC, or XMP data (or be empty dict if no metadata)
    # The key point is it should not raise an exception and should return a dict
    assert isinstance(metadata, dict)
