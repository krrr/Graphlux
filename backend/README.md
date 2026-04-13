# Graphlux Backend

A DAG-based image and video processing backend built with FastAPI.

## Prerequisites

- Python 3.10+
- FFmpeg (for video/audio processing)
- ImageMagick (for image conversion)
- pyexiv2 (for metadata read/write; ExifTool CLI is not required)

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
