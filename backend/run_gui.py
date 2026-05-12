import sys
import os
import threading
import time
import uvicorn
import webbrowser
import pystray
import ctypes
import argparse
import subprocess
from pystray import MenuItem

# Add current dir to sys.path so graphlux can be imported correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from graphlux.api import app
from graphlux import get_server_config

# Global state
should_exit = False

def run_server(host, port):
    config = uvicorn.Config(app, host=host, port=port, workers=1, log_level="error")
    server = uvicorn.Server(config)
    server.run()


def get_chrome_path():
    """Detect Chrome installation path from Windows registry."""
    if sys.platform != 'win32':
        return None

    import winreg
    paths = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"),
        (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe")
    ]

    for hkey, subkey in paths:
        try:
            with winreg.OpenKey(hkey, subkey) as key:
                path, _ = winreg.QueryValueEx(key, "")
                if os.path.exists(path):
                    return path
        except OSError:
            continue
    return None


def open_browser(url):
    chrome_path = get_chrome_path()
    if chrome_path:
        subprocess.Popen([chrome_path, f"--app={url}", "--window-size=1440,900"])
    else:
        webbrowser.open(url)


def main():
    global should_exit

    parser = argparse.ArgumentParser(description="Graphlux GUI")
    parser.add_argument("--web-debug", action="store_true", help="Start in web debug mode (no backend, use localhost:4200)")
    args = parser.parse_args()

    # Set high DPI awareness, prevent blur tray icon
    ctypes.windll.shcore.SetProcessDpiAwareness(1)

    host, port = get_server_config()

    if not args.web_debug:
        # Start FastAPI in a background thread
        server_thread = threading.Thread(target=run_server, args=(host, port), daemon=True)
        server_thread.start()

        # Wait a moment for the server to start
        time.sleep(1)

    url = "http://localhost:4200" if args.web_debug else f"http://{host}:{port}"

    def show_window(icon, item):
        open_browser(url)

    def quit_app(icon, item):
        global should_exit
        should_exit = True
        icon.stop()
        os._exit(0)  # Force exit to cleanly kill the uvicorn daemon thread

    def setup_tray():
        icon = pystray.Icon("Graphlux", 'scripts/app.ico', "Graphlux", menu=pystray.Menu(
            MenuItem('Open', show_window, default=True),
            MenuItem('Quit', quit_app)
        ))
        icon.run()

    # Open browser immediately
    open_browser(url)

    # Start tray icon in a background thread
    tray_thread = threading.Thread(target=setup_tray, daemon=True)
    tray_thread.start()

    # Keep main thread alive until exit
    while not should_exit:
        time.sleep(1)


if __name__ == '__main__':
    main()