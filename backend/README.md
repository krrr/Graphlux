# CyberHamster Backend

A DAG-based image and video processing backend built with FastAPI.

## Prerequisites

- Python 3.10+
- FFmpeg (for video/audio processing)
- ImageMagick (for image conversion)
- ExifTool (handled via pyexiv2)

## Installation

```bash
pip install -e ".[dev]"
```

## Running the Server

```bash
python run.py
```

## Running Tests

```bash
pytest
```
