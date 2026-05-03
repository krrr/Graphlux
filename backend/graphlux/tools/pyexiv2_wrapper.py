import pyexiv2
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger('engine')

class Pyexiv2Wrapper:
    """Read first and then pass bytes array to avoid unicode code page problem on Windows."""

    @staticmethod
    def read_metadata(file_path: str) -> Optional[Dict[str, Any]]:
        """
        Read metadata using pyexiv2.

        :param file_path: Path to the file.
        :return: A dictionary of metadata, or None if reading fails.
        """
        try:
            with open(file_path, 'rb') as f, pyexiv2.ImageData(f.read()) as img:
                metadata = {}
                metadata.update(img.read_exif())
                metadata.update(img.read_iptc())
                metadata.update(img.read_xmp())
                return metadata
        except Exception as e:
            logger.error(f"pyexiv2 read error for '{file_path}': {e}")
            return None

    @staticmethod
    def write_metadata(file_path: str, tags: Dict[str, Any]) -> bool:
        """
        Write metadata to a file using pyexiv2.

        :param file_path: Path to the file.
        :param tags: Dictionary of tag names and values (e.g., {'Xmp.ProcessingStatus': 'Processed'}).
        :return: True if successful, False otherwise.
        """
        try:
            write_data = None
            with open(file_path, 'rb') as f, pyexiv2.ImageData(f.read()) as img:
                xmp_tags = {}

                for key, value in tags.items():
                    if not ':' in key:
                        raise Exception("Invalid tag name")

                    prefix, tag = key.split(':', 1)
                    prefix_lower = prefix.lower()
                    if prefix_lower == 'xmp':
                        # pyexiv2 format: 'Xmp.ns.tag'
                        xmp_tags[f"Xmp.Graphlux.{tag}"] = value

                if xmp_tags:
                    pyexiv2.registerNs('Graphlux metadata', 'Graphlux')
                    img.modify_xmp(xmp_tags)
                    write_data = img.get_bytes()
            if write_data:
                with open(file_path, 'wb') as f:
                    f.write(write_data)
            return True
        except Exception as e:
            logger.error(f"pyexiv2 write error for {file_path}: {e}")
            return False
