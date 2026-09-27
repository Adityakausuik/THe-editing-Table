import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const realRootDir = fs.existsSync(rootDir) ? fs.realpathSync(rootDir) : rootDir;

// Possible locations where build artifacts could be produced
const candidateSources = [
  path.join(rootDir, "client", "dist"),
  path.join(realRootDir, "client", "dist"),
  path.join(rootDir, "dist"),
  path.join(realRootDir, "dist"),
  path.join(rootDir, "public"),
  path.join(realRootDir, "public")
];

let sourceDir = null;
for (const cand of candidateSources) {
  if (fs.existsSync(cand) && fs.existsSync(path.join(cand, "index.html"))) {
    sourceDir = cand;
    break;
  }
}

const targets = [
  path.join(rootDir, "dist"),
  path.join(rootDir, "public"),
  path.join(rootDir, "client", "dist"),
  path.join(rootDir, "server", "dist")
];

if (sourceDir) {
  for (const target of targets) {
    try {
      if (fs.existsSync(target) && fs.realpathSync(target) === fs.realpathSync(sourceDir)) {
        continue;
      }
    } catch {
      // Continue if realpath fails
    }
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(sourceDir, target, { recursive: true, force: true });
  }
  console.log(`[BUILD] Successfully mirrored static build from ${sourceDir} across all targets (dist, public, client/dist, server/dist)`);
} else {
  console.warn(`[BUILD] Warning: No compiled index.html found. Ensuring output directories exist.`);
  for (const target of targets) {
    fs.mkdirSync(target, { recursive: true });
  }
}
