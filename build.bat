@echo off
echo Building CyberHamster with Nuitka...
echo Make sure you have installed: pip install nuitka pystray pywebview Pillow uvicorn fastapi

REM Compile the application
python -m nuitka ^
  --standalone ^
  --plugin-enable=pywebview ^
  --include-data-file=icon.png=icon.png ^
  --include-package=uvicorn ^
  --include-package=fastapi ^
  --include-package=pydantic ^
  --include-package=sqlmodel ^
  --include-package=cyberhamster ^
  --windows-console-mode=disable ^
  --windows-icon-from-ico=icon.png ^
  --output-dir=build ^
  main_gui.py

echo Build complete! The executable is located in the build folder.
pause
