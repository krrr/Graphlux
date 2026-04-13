import os
import subprocess
import sys
import shutil

def build():
    # Get the project root directory (Graphlux/backend)
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(backend_dir)

    entry_point = "run_gui.py"
    output_dir = "dist"
    
    # Ensure static directory exists (even if empty)
    # This is where the Angular frontend build should be placed before packaging
    static_dir = os.path.join(backend_dir, "static")
    os.makedirs(static_dir, exist_ok=True)

    print(f"Project directory: {backend_dir}")
    print(f"Entry point: {entry_point}")
    print(f"Static directory: {static_dir}")

    # Common Nuitka flags for a standalone GUI app with FastAPI
    cmd = [
        sys.executable, "-m", "nuitka",
        "--standalone",
        # "--windows-console-mode=disable",
        
        # Include our main package
        "--include-package=graphlux",
        
        "--nofollow-import-to=cryptography",
        "--nofollow-import-to=tornado",
        "--nofollow-import-to=pygments",
        "--nofollow-import-to=jinja2",
        "--nofollow-import-to=sqlalchemy.dialects.mssql",
        "--nofollow-import-to=sqlalchemy.dialects.mysql",
        "--nofollow-import-to=sqlalchemy.dialects.oracle",
        "--nofollow-import-to=sqlalchemy.dialects.postgresql",

        "--user-package-configuration-file=scripts/nuitka_package.yml",

        # Include static assets
        f"--include-data-dir={static_dir}=static",
        
        # Standard flags
        "--follow-imports",
        f"--output-dir={output_dir}",
        "--assume-yes-for-downloads",
        
        # Performance/Compression
        "--enable-plugin=pylint-warnings",
        "--include-windows-runtime-dlls=no",
        # "--onefile", # Optional: can be enabled via CLI arg below
        
        entry_point
    ]

    # Optional: Add --onefile if requested via command line
    if "--onefile" in sys.argv:
        cmd.append("--onefile")
        print(">>> Onefile mode enabled (Note: startup might be slower)")

    # Optional: Add icon if available (looking for favicon or custom ico)
    # Adjust this path as needed
    potential_icon = os.path.join(backend_dir, "..", "frontend", "public", "favicon.ico")
    if os.path.exists(potential_icon):
        cmd.append(f"--windows-icon-from-ico={potential_icon}")
        print(f">>> Using icon from: {potential_icon}")

    print("\nStarting Nuitka build process...\n")
    print("Command:", " ".join(cmd))
    print("-" * 40)

    try:
        subprocess.run(cmd, check=True)
        print("\n" + "=" * 40)
        print("Build successful!")
        print(f"Executable can be found in the '{output_dir}' directory.")
        print("=" * 40)
    except subprocess.CalledProcessError as e:
        print(f"\nBuild failed with exit code {e.returncode}")
        sys.exit(e.returncode)

if __name__ == "__main__":
    # Check if Nuitka is installed
    try:
        import nuitka
    except ImportError:
        print("Error: Nuitka is not installed.")
        print("Please install it and its recommended dependencies:")
        print("  pip install nuitka zstandard")
        sys.exit(1)

    build()
