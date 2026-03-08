import subprocess
from typing import List

class ImageMagickWrapper:
    @staticmethod
    def run(input_file: str, output_file: str, args: List[str]) -> bool:
        """
        Run ImageMagick (magick) with given arguments.

        :param input_file: Path to input file.
        :param output_file: Path to output file.
        :param args: List of magick arguments (e.g., ['-resize', '800x600', '-quality', '85']).
        :return: True if successful, False otherwise.
        """
        # Command syntax: magick input_file [args] output_file
        command = ["magick", input_file] + args + [output_file]
        try:
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"ImageMagick error: {e.stderr}")
            return False
