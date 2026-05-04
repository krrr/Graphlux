import sys
import os
import threading
import time
import gc
import uvicorn
import webview
import pystray
import ctypes
import argparse
from pystray import MenuItem

# Add current dir to sys.path so graphlux can be imported correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from graphlux.api import app
from graphlux import get_server_config

# Global state
window = None
show_requested = threading.Event()
should_exit = False

def run_server(host, port):
    config = uvicorn.Config(app, host=host, port=port, log_level="error")
    server = uvicorn.Server(config)
    server.run()


def main():
    global window, should_exit

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

    def on_closing():
        global window
        # Hide immediately to feel responsive
        if window:
            window.hide()
        return True # Allow destruction to save memory

    def on_closed():
        global window
        window = None
        # Explicit garbage collection to minimize memory usage after browser engine shutdown
        gc.collect()

    def show_window(icon, item):
        global window
        if window:
            try:
                window.show()
                window.restore()
            except Exception:
                # Fallback if window was destroyed but reference not cleared
                window = None
                show_requested.set()
        else:
            show_requested.set()

    def quit_app(icon, item):
        global should_exit
        should_exit = True
        icon.stop()
        if window:
            try:
                window.destroy()
            except Exception:
                pass
        os._exit(0)  # Force exit to cleanly kill the uvicorn daemon thread

    def setup_tray():
        icon = pystray.Icon("Graphlux", 'E:\\workspace\\Graphlux\\backend\\dist\\run_gui.dist\\run_gui.exe', "Graphlux", menu=pystray.Menu(
            MenuItem('Open', show_window, default=True),
            MenuItem('Quit', quit_app)
        ))
        icon.run()

    # Start tray icon in a background thread
    tray_thread = threading.Thread(target=setup_tray, daemon=True)
    tray_thread.start()

    # Initial request to show window
    show_requested.set()

    url = "http://localhost:4200" if args.web_debug else f"http://{host}:{port}"

    # Main loop to manage window lifecycle
    while not should_exit:
        if show_requested.wait(timeout=1):
            show_requested.clear()
            if not window:
                window = webview.create_window("Graphlux", url, width=1424, height=1068, transparent=True)
                window.events.closing += on_closing
                window.events.closed += on_closed
                webview.start()
        time.sleep(0.1)

if __name__ == '__main__':
    main()
