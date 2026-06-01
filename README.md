Inventory Management

Lightweight inventory management monorepo. Contains an API server, frontend inventory app, and shared libraries.

Quick start

1. Install dependencies (pnpm recommended):

```bash
pnpm install
```

2. Build and start the API server:

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

3. Run the frontend (inventory):

```bash
pnpm --filter inventory dev
```

Notes

- This repository uses pnpm workspaces. Keep `pnpm-workspace.yaml` at the repo root.
- See `artifacts/api-server` for backend code and `inventory` for the frontend.
