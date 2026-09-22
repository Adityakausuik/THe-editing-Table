import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const clientDist = path.join(rootDir, "client", "dist");
const rootDist = path.join(rootDir, "dist");
const serverDist = path.join(rootDir, "server", "dist");

if (fs.existsSync(clientDist)) {
  fs.cpSync(clientDist, rootDist, { recursive: true });
  fs.cpSync(clientDist, serverDist, { recursive: true });
  console.log(`[BUILD] Successfully mirrored static build across root/dist and server/dist`);
} else {
  console.warn(`[BUILD] Warning: ${clientDist} does not exist to mirror.`);
}
