import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const apiPort = process.env.API_PORT ?? "5000";
const inventoryPort = process.env.PORT ?? "5173";

function startProcess(label, args, extraEnv) {
  // Build a single shell command string to improve Windows compatibility.
  const quotedArgs = args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ");
  const cmd = `${npmCommand} ${quotedArgs}`;

  let child;
  if (process.platform === "win32") {
    // Use cmd.exe /c on Windows to run the command string
    child = spawn("cmd.exe", ["/c", cmd], {
      stdio: "inherit",
      env: {
        ...process.env,
        ...extraEnv,
      },
    });
  } else {
    // Use sh -c on Unix-like systems
    child = spawn("sh", ["-c", cmd], {
      stdio: "inherit",
      env: {
        ...process.env,
        ...extraEnv,
      },
    });
  }

  child.on("exit", (code, signal) => {
    if (stopped) {
      return;
    }

    stopped = true;

    for (const activeChild of activeChildren) {
      if (activeChild !== child) {
        activeChild.kill();
      }
    }

    process.exit(code ?? (signal ? 1 : 0));
  });

  child.on("error", (error) => {
    if (stopped) {
      return;
    }

    stopped = true;
    console.error(`[${label}]`, error);

    for (const activeChild of activeChildren) {
      if (activeChild !== child) {
        activeChild.kill();
      }
    }

    process.exit(1);
  });

  activeChildren.push(child);

  return child;
}

function shutdown() {
  if (stopped) {
    return;
  }

  stopped = true;

  for (const child of activeChildren) {
    child.kill();
  }

  process.exit(0);
}

let stopped = false;
const activeChildren = [];

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startProcess(
  "api-server",
  ["--prefix", "artifacts/api-server", "run", "dev"],
  {
    NODE_ENV: "development",
    PORT: apiPort,
  },
);

startProcess(
  "inventory",
  ["--prefix", "artifacts/inventory", "run", "dev"],
  {
    NODE_ENV: "development",
    PORT: inventoryPort,
    BASE_PATH: "/",
    API_PORT: apiPort,
  },
);