import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unwatchFile,
  watchFile,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const WATCH_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
]);

const WATCH_PATHS = [
  "/app/mobile/app",
  "/app/mobile/lib",
  "/app/mobile/components",
  "/app/mobile/global.css",
  "/app/mobile/tailwind.config.js",
  "/app/mobile/metro.config.js",
  "/app/packages/shared/src",
];

const watchedFiles = new Set();
let child = null;
let restartTimer = null;
let childStopping = false;

const APP_ROOT = "/app/mobile";
const PACKAGE_LOCK_PATH = path.join(APP_ROOT, "package-lock.json");
const NODE_MODULES_PATH = path.join(APP_ROOT, "node_modules");
const DEP_HASH_PATH = path.join(NODE_MODULES_PATH, ".package-lock.hash");

function fileHash(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function ensureDependencies() {
  const currentHash = fileHash(PACKAGE_LOCK_PATH);
  const savedHash = existsSync(DEP_HASH_PATH)
    ? readFileSync(DEP_HASH_PATH, "utf8").trim()
    : null;

  if (savedHash === currentHash && existsSync(path.join(NODE_MODULES_PATH, "expo"))) {
    return;
  }

  console.log("[dev-web] package-lock changed or dependencies missing, running npm ci");
  mkdirSync(NODE_MODULES_PATH, { recursive: true });
  const result = spawnSync("npm", ["ci"], {
    cwd: APP_ROOT,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  writeFileSync(DEP_HASH_PATH, `${currentHash}\n`);
}

function listFiles(targetPath) {
  if (!existsSync(targetPath)) {
    return [];
  }

  const stats = statSync(targetPath);
  if (stats.isFile()) {
    return WATCH_EXTENSIONS.has(path.extname(targetPath)) ? [targetPath] : [];
  }

  const files = [];
  for (const entry of readdirSync(targetPath, { withFileTypes: true })) {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
      continue;
    }

    if (WATCH_EXTENSIONS.has(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
}

function syncWatchers() {
  for (const targetPath of WATCH_PATHS) {
    for (const file of listFiles(targetPath)) {
      if (watchedFiles.has(file)) {
        continue;
      }

      watchedFiles.add(file);
      watchFile(file, { interval: 500 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
          scheduleRestart(file);
        }
      });
    }
  }
}

function startExpo() {
  console.log("[dev-web] starting Expo web server");
  childStopping = false;
  child = spawn("node", ["./node_modules/expo/bin/cli", "start", "--web", "--port", "8081"], {
    cwd: "/app/mobile",
    stdio: "inherit",
    env: {
      ...process.env,
      CI: "1",
    },
    shell: false,
  });

  child.on("exit", () => {
    child = null;
    if (!childStopping) {
      console.log("[dev-web] Expo exited unexpectedly, restarting");
      startExpo();
    }
  });
}

function scheduleRestart(file) {
  console.log(`[dev-web] change detected: ${path.relative("/app", file)}`);
  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    restartTimer = null;
    restartExpo();
  }, 300);
}

function restartExpo() {
  if (!child) {
    startExpo();
    return;
  }

  console.log("[dev-web] restarting Expo for latest changes");
  childStopping = true;
  child.once("exit", () => {
    startExpo();
  });
  child.kill("SIGTERM");
}

function cleanupAndExit(signal) {
  console.log(`[dev-web] received ${signal}, shutting down`);
  for (const file of watchedFiles) {
    unwatchFile(file);
  }

  if (!child) {
    process.exit(0);
  }

  childStopping = true;
  child.once("exit", () => process.exit(0));
  child.kill("SIGTERM");
}

ensureDependencies();
syncWatchers();
setInterval(syncWatchers, 2000);
startExpo();

process.on("SIGINT", () => cleanupAndExit("SIGINT"));
process.on("SIGTERM", () => cleanupAndExit("SIGTERM"));
