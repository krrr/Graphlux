# Background
The Graphlux project is a automated batch processing and compressing of images and videos, utilizing a Directed Acyclic Graph (DAG) node pipeline architecture. It provides a web interface, allowing local or remote access.

# Frontend
- Frontend uses Angular with the ng-zorro-antd UI component library. Use the <nz-tabs> element as tab component, <nz-tabset> is deprecated.
- Frontend Angular commands should be executed from the frontend/ directory using npx ng or pnpm (e.g., pnpm run test -- --watch=false, pnpm run build).
- Frontend development server can be started for local testing by running pnpm run start within the frontend directory.

# Frontend Best Practices
- Keep components small and focused on a single responsibility
- Use `signal()` for local component state
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the `inject()` function instead of constructor injection
- nz-icon新增的图标需要在`app.config.ts`内导入
- 组件文件名需带上component例如aa.component.ts

# Backend
- The project backend is a Python application built with FastAPI and SQLModel.
- The backend development environment is set up by running pip install -e . in the backend directory, and the server is started using python backend/run.py.
- Backend tests should be executed using python3 -m pytest from the backend/ directory.
