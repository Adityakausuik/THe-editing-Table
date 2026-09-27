import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const clientDist = path.join(rootDir, "client", "dist");
const rootDist = path.join(rootDir, "dist");
const rootPublic = path.join(rootDir, "public");
const serverDist = path.join(rootDir, "server", "dist");

if (fs.existsSync(clientDist)) {
  if (fs.existsSync(rootDist)) fs.rmSync(rootDist, { recursive: true, force: true });
  if (fs.existsSync(rootPublic)) fs.rmSync(rootPublic, { recursive: true, force: true });
  if (fs.existsSync(serverDist)) fs.rmSync(serverDist, { recursive: true, force: true });
  fs.cpSync(clientDist, rootDist, { recursive: true });
  fs.cpSync(clientDist, rootPublic, { recursive: true });
  fs.cpSync(clientDist, serverDist, { recursive: true });
  console.log(`[BUILD] Successfully mirrored static build across root/dist, root/public, and server/dist`);
} else {
  console.warn(`[BUILD] Warning: ${clientDist} does not exist to mirror.`);
}
