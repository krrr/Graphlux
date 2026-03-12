# Background
The CyberHamster project is a automated batch processing and compressing of images and videos, utilizing a Directed Acyclic Graph (DAG) node pipeline architecture. It provides a web interface, allowing local or remote access.

# Tips
- The project backend is a Python application built with FastAPI and SQLModel.
- The project frontend uses Angular with the ng-zorro-antd UI component library. Use the <nz-tabs> element as tab component, <nz-tabset> is deprecated.
- Backend tests should be executed using python3 -m pytest from the backend/ directory.
- Frontend Angular commands should be executed from the frontend/ directory using pnpm (e.g., pnpm run test -- --watch=false, pnpm run build) or npx ng if the global ng CLI is missing.
- The backend development environment is set up by running pip install -e . in the backend directory, and the server is started using python backend/run.py.
- The frontend development server can be started for local testing by running pnpm run start within the frontend directory.