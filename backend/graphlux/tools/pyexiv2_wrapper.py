import pyexiv2
from typing import Dict, Any, Optional
from ..logger import logger

class Pyexiv2Wrapper:
    @staticmethod
    def read_metadata(file_path: str) -> Optional[Dict[str, Any]]:
        """
        Read metadata using pyexiv2.

        :param file_path: Path to the file.
        :return: A dictionary of metadata, or None if reading fails.
        """
        try:
            with pyexiv2.Image(file_path) as img:
                metadata = {}
                metadata.update(img.read_exif())
                metadata.update(img.read_iptc())
                metadata.update(img.read_xmp())
                return metadata
        except Exception as e:
            logger.error(f"pyexiv2 read error for {file_path}: {e}")
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
            with pyexiv2.Image(file_path) as img:
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
            return True
        except Exception as e:
            logger.error(f"pyexiv2 write error for {file_path}: {e}")
            return False
