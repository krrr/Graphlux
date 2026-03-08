import subprocess
from typing import List
from ..logger import logger

from sqlmodel import Session
from ..db import engine
from ..models import SystemSettings

class ImageMagickWrapper:
    @staticmethod
    def run(input_file: str, output_file: str, args: List[str]) -> bool:
        magick_cmd = "magick"
        try:
            with Session(engine) as session:
                settings = session.get(SystemSettings, 1)
                if settings and settings.imagemagick_path:
                    magick_cmd = settings.imagemagick_path
        except Exception as e:
            logger.warning(f"Could not load magick path from DB: {e}")

        """
        Run ImageMagick (magick) with given arguments.

        :param input_file: Path to input file.
        :param output_file: Path to output file.
        :param args: List of magick arguments (e.g., ['-resize', '800x600', '-quality', '85']).
        :return: True if successful, False otherwise.
        """
        # Command syntax: magick input_file [args] output_file
        command = [magick_cmd, input_file] + args + [output_file]
        try:
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"ImageMagick error for {input_file}: {e.stderr}")
            return False
