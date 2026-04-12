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
from pystray import MenuItem as item

# Add current dir to sys.path so cyberhamster can be imported correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cyberhamster import app

# Global state
window = None
show_requested = threading.Event()
should_exit = False

def run_server():
    config = uvicorn.Config(app, host="127.0.0.1", port=8000, log_level="error")
    server = uvicorn.Server(config)
    server.run()


def main():
    global window, should_exit

    parser = argparse.ArgumentParser(description="CyberHamster GUI")
    parser.add_argument("--web-debug", action="store_true", help="Start in web debug mode (no backend, use localhost:4200)")
    args = parser.parse_args()

    # Set high DPI awareness, prevent blur tray icon
    ctypes.windll.shcore.SetProcessDpiAwareness(1)
    
    if not args.web_debug:
        # Start FastAPI in a background thread
        server_thread = threading.Thread(target=run_server, daemon=True)
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
        icon = pystray.Icon("CyberHamster", 'E:\\workspace\\CyberHamster\\backend\\dist\\run_gui.dist\\run_gui.exe', "CyberHamster", menu=pystray.Menu(
            item('Open', show_window, default=True),
            item('Quit', quit_app)
        ))
        icon.run()

    # Start tray icon in a background thread
    tray_thread = threading.Thread(target=setup_tray, daemon=True)
    tray_thread.start()

    # Initial request to show window
    show_requested.set()

    url = "http://localhost:4200" if args.web_debug else "http://127.0.0.1:8000"

    # Main loop to manage window lifecycle
    while not should_exit:
        if show_requested.wait(timeout=1):
            show_requested.clear()
            if not window:
                window = webview.create_window("CyberHamster", url, width=1424, height=1068, transparent=True)
                window.events.closing += on_closing
                window.events.closed += on_closed
                webview.start()
        time.sleep(0.1)

if __name__ == '__main__':
    main()
