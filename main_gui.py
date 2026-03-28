import os
import sys
import threading
import time
import uvicorn
import webview
import pystray
from PIL import Image

def is_bundled():
    """Check if we are running in a bundled executable (like Nuitka)."""
    return getattr(sys, 'frozen', False) or '__compiled__' in globals()

def setup_autostart():
    """Setup autostart only if we are on Windows and running a bundled executable."""
    if not is_bundled():
        return

    if sys.platform == 'win32':
        import winreg
        try:
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                0,
                winreg.KEY_SET_VALUE | winreg.KEY_WRITE
            )
            executable_path = sys.executable
            # Start hidden on startup
            winreg.SetValueEx(key, "CyberHamster", 0, winreg.REG_SZ, f'"{executable_path}" --hidden')
            winreg.CloseKey(key)
        except Exception as e:
            print(f"Failed to set autostart: {e}")

def start_backend():
    # Make sure we can import cyberhamster
    # When using Nuitka, the backend folder structure might be different
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    if os.path.exists(backend_dir) and backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    elif os.path.dirname(os.path.abspath(__file__)) not in sys.path:
        # Fallback if we are running directly from backend
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    try:
        from cyberhamster import app
        # uvicorn.run when not passing app as a string shouldn't use reload=True
        uvicorn.run(app, host="127.0.0.1", port=8000, reload=False, workers=1)
    except Exception as e:
        print(f"Backend failed to start: {e}")

# We need to keep a reference to the icon and window to avoid garbage collection issues
tray_icon = None

def on_closing(window):
    window.hide()
    # Cancel the closing event so the app stays in the tray
    return False

def show_window(icon, item, window):
    window.show()

def quit_app(icon, item, window):
    global tray_icon
    if tray_icon:
        tray_icon.stop()
    window.destroy()
    os._exit(0)

def create_tray(window):
    global tray_icon

    # Try to load a real icon if it exists
    icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon.png")
    image = None
    if os.path.exists(icon_path):
        try:
            image = Image.open(icon_path)
        except Exception:
            pass

    if image is None:
        # Create a simple colored square as a fallback icon
        image = Image.new('RGB', (64, 64), color=(73, 109, 137))

    menu = pystray.Menu(
        pystray.MenuItem('Show', lambda icon, item: show_window(icon, item, window)),
        pystray.MenuItem('Quit', lambda icon, item: quit_app(icon, item, window))
    )

    tray_icon = pystray.Icon("CyberHamster", image, "CyberHamster", menu)
    tray_icon.run()

def main():
    setup_autostart()

    # 1. Start the backend in a separate thread
    backend_thread = threading.Thread(target=start_backend, daemon=True)
    backend_thread.start()

    # Wait a moment for the server to be ready
    time.sleep(2)

    # 2. Setup WebView window
    start_hidden = '--hidden' in sys.argv
    window = webview.create_window(
        title='CyberHamster',
        url='http://127.0.0.1:8000',
        width=1200,
        height=800,
        hidden=start_hidden
    )

    # 3. Setup System Tray in a separate thread
    tray_thread = threading.Thread(target=create_tray, args=(window,), daemon=True)
    tray_thread.start()

    # Setup the closing event
    # Using the webview event system carefully since some events are thread-sensitive
    # We assign the event handler
    window.events.closing += lambda: on_closing(window)

    # 4. Start WebView main loop (must be in main thread)
    webview.start()

if __name__ == '__main__':
    main()
