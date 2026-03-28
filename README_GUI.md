# CyberHamster Desktop GUI

This directory contains `main_gui.py`, an entry point script that starts the backend using Uvicorn, displays a System Tray Icon, and presents the web frontend in a native application window using WebView. It also supports Windows auto-start on login when packaged as an executable.

## Requirements

Ensure you install all extra requirements:

```bash
pip install pystray pywebview Pillow uvicorn fastapi nuitka
```

## Running directly

To run it straight from the source:

```bash
python main_gui.py
```

## Building as an Executable (Nuitka)

On Windows, you can compile the entire application into a standalone executable that works as a portable application with the `build.bat` script:

```bat
build.bat
```

The resulting build in the `build/` folder can be run independently, and its auto-start mechanism will be activated automatically the first time it is run.
