import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

// Ensure a sensible default development environment so `npm run dev` works
// without requiring the caller to set environment variables manually.
process.env.NODE_ENV = process.env.NODE_ENV ?? "development";
process.env.PORT = process.env.PORT ?? "5000";

const buildResult = spawnSync(npmCommand, ["run", "build"], {
  stdio: "inherit",
  env: process.env,
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const startResult = spawnSync(npmCommand, ["run", "start"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(startResult.status ?? 0);