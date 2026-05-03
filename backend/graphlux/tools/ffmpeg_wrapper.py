import subprocess
import logging
from typing import List
from sqlmodel import Session
from ..db import engine
from ..models import SystemSettings

logger = logging.getLogger('engine')

class FFmpegWrapper:
    @staticmethod
    def run(input_file: str, output_file: str, args: List[str]) -> bool:
        ffmpeg_cmd = "ffmpeg"
        try:
            with Session(engine) as session:
                settings = session.get(SystemSettings, 1)
                if settings and settings.ffmpeg_path:
                    ffmpeg_cmd = settings.ffmpeg_path
        except Exception as e:
            logger.warning(f"Could not load ffmpeg path from DB: {e}")

        """
        Run FFmpeg with given arguments.

        :param input_file: Path to input file.
        :param output_file: Path to output file.
        :param args: List of ffmpeg arguments (e.g., ['-map', '0:v', '-c:v', 'copy']).
        :return: True if successful, False otherwise.
        """
        # Command syntax: ffmpeg -y -i input_file [args] output_file
        command = [ffmpeg_cmd, "-y", "-i", input_file] + args + [output_file]
        try:
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg error for {input_file}: {e.stderr}")
            return False
