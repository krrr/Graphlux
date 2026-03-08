import pyexiv2
from typing import Dict, Any, Optional
from ..logger import logger

class ExifToolWrapper:
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
                exif_tags = {}
                iptc_tags = {}
                xmp_tags = {}

                for tag, value in tags.items():
                    # Map tags to their respective group based on prefix
                    lower_tag = tag.lower()
                    if lower_tag.startswith('exif.'):
                        exif_tags[tag] = value
                    elif lower_tag.startswith('iptc.'):
                        iptc_tags[tag] = value
                    elif lower_tag.startswith('xmp.'):
                        xmp_tags[tag] = value
                    else:
                        # Fallback for old ExifTool style or unspecified
                        if ':' in tag:
                            prefix, rest = tag.split(':', 1)
                            prefix_lower = prefix.lower()
                            # Standard ExifTool prefixes
                            if prefix_lower == 'xmp':
                                # pyexiv2 expects 'Xmp.prefix.tag' or just 'Xmp.tag'?
                                # Usually 'Xmp.ns.tag'. We might need to guess the namespace if not provided.
                                # For simplicity, let's assume if it's 'XMP:ProcessingStatus', it might mean 'Xmp.ProcessingStatus'
                                xmp_tags[f"Xmp.{rest}"] = value
                            elif prefix_lower == 'exif':
                                exif_tags[f"Exif.{rest}"] = value
                            elif prefix_lower == 'iptc':
                                iptc_tags[f"Iptc.{rest}"] = value
                            else:
                                xmp_tags[tag] = value # Default to XMP?
                        else:
                            # If no prefix and no dot, we can't be sure.
                            # But pyexiv2 requires specific full tag names like 'Exif.Image.Artist'.
                            # If the user provides just 'Artist', it might fail.
                            # We'll just pass it to all and let pyexiv2 handle or fail.
                            xmp_tags[tag] = value

                if exif_tags:
                    img.modify_exif(exif_tags)
                if iptc_tags:
                    img.modify_iptc(iptc_tags)
                if xmp_tags:
                    img.modify_xmp(xmp_tags)
            return True
        except Exception as e:
            logger.error(f"pyexiv2 write error for {file_path}: {e}")
            return False
