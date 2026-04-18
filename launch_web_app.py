import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

CLIENT_DIR = PROJECT_ROOT / "client"
DIST_INDEX = CLIENT_DIR / "dist" / "index.html"
NODE_MODULES = CLIENT_DIR / "node_modules"


def build_react_if_needed():
    if DIST_INDEX.exists():
        return

    print("client/dist not found — building React app...")

    if not NODE_MODULES.exists():
        print("Installing client dependencies (npm ci)...")
        install = subprocess.run(
            ["npm", "ci"],
            cwd=str(CLIENT_DIR),
            capture_output=False,
        )
        if install.returncode != 0:
            print("npm ci failed — React UI will not be available.")
            return

    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=str(CLIENT_DIR),
        capture_output=False,
    )
    if result.returncode != 0:
        print("React build failed. Falling back to legacy frontend if available.")


build_react_if_needed()

from backend.web_app import main


if __name__ == "__main__":
    main()
