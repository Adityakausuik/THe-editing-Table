import fs from "node:fs";
import path from "node:path";

const rootDir = "C:/Users/adity/OneDrive/Desktop/THe editing Table";

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function getDirStats(dirPath, fileList = [], dirMap = new Map()) {
  let totalBytes = 0;
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    return { totalBytes: 0 };
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    try {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        const sub = await getDirStats(fullPath, fileList, dirMap);
        totalBytes += sub.totalBytes;
        dirMap.set(fullPath, sub.totalBytes);
      } else if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        totalBytes += stat.size;
        fileList.push({ path: fullPath, size: stat.size });
      }
    } catch {
      // ignore unreadable
    }
  }

  dirMap.set(dirPath, totalBytes);
  return { totalBytes };
}

async function auditDisk() {
  console.log("==================================================================");
  console.log("PROJECT LOCAL DISK USAGE & REPOSITORY STORAGE AUDIT");
  console.log("==================================================================\n");

  const fileList = [];
  const dirMap = new Map();

  console.log("Scanning repository directories...");
  const start = Date.now();
  const { totalBytes } = await getDirStats(rootDir, fileList, dirMap);
  console.log(`Scan completed in ${((Date.now() - start) / 1000).toFixed(1)}s.`);
  console.log(`TOTAL REPOSITORY SIZE: ${formatBytes(totalBytes)} (${totalBytes.toLocaleString()} bytes)\n`);

  // Specific Categorical Breakdown
  function getSubDirSize(relPath) {
    const target = path.resolve(rootDir, relPath);
    return dirMap.get(target) || 0;
  }

  const frontendSrc = getSubDirSize("client/src");
  const backendSrc = getSubDirSize("server/src");
  const clientDist = getSubDirSize("client/dist");
  const rootNodeModules = getSubDirSize("node_modules");
  const clientNodeModules = getSubDirSize("client/node_modules");
  const serverNodeModules = getSubDirSize("server/node_modules");
  const totalNodeModules = rootNodeModules + clientNodeModules + serverNodeModules;
  const gitDir = getSubDirSize(".git");
  const uploadsDir = getSubDirSize("server/uploads") + getSubDirSize("uploads");
  const vercelDir = getSubDirSize(".vercel");
  const cacheDir = getSubDirSize("client/node_modules/.vite") + getSubDirSize("node_modules/.vite");

  console.log("[1] CATEGORICAL STORAGE BREAKDOWN:");
  console.table([
    { Category: "Total Repository", Size: formatBytes(totalBytes), Bytes: totalBytes },
    { Category: "All node_modules", Size: formatBytes(totalNodeModules), Bytes: totalNodeModules },
    { Category: "  - Root node_modules", Size: formatBytes(rootNodeModules), Bytes: rootNodeModules },
    { Category: "  - Client node_modules", Size: formatBytes(clientNodeModules), Bytes: clientNodeModules },
    { Category: "  - Server node_modules", Size: formatBytes(serverNodeModules), Bytes: serverNodeModules },
    { Category: "Git History (.git)", Size: formatBytes(gitDir), Bytes: gitDir },
    { Category: "Frontend Build Output (client/dist)", Size: formatBytes(clientDist), Bytes: clientDist },
    { Category: "Frontend Source (client/src)", Size: formatBytes(frontendSrc), Bytes: frontendSrc },
    { Category: "Backend Source (server/src)", Size: formatBytes(backendSrc), Bytes: backendSrc },
    { Category: "Local Uploads & Media", Size: formatBytes(uploadsDir), Bytes: uploadsDir },
    { Category: "Vercel Cache/Artifacts (.vercel)", Size: formatBytes(vercelDir), Bytes: vercelDir },
    { Category: "Vite Cache (.vite)", Size: formatBytes(cacheDir), Bytes: cacheDir }
  ]);

  // Top 30 Largest Files
  fileList.sort((a, b) => b.size - a.size);
  console.log("\n[2] TOP 30 LARGEST FILES IN REPOSITORY:");
  const top30Files = fileList.slice(0, 30).map((f, i) => ({
    Rank: i + 1,
    File: path.relative(rootDir, f.path),
    Size: formatBytes(f.size),
    Bytes: f.size
  }));
  console.table(top30Files);

  // Top 20 Largest Directories
  const dirList = [];
  for (const [dPath, dSize] of dirMap.entries()) {
    dirList.push({ path: dPath, size: dSize });
  }
  dirList.sort((a, b) => b.size - a.size);

  console.log("\n[3] TOP 20 LARGEST DIRECTORIES IN REPOSITORY:");
  const top20Dirs = dirList.slice(0, 20).map((d, i) => ({
    Rank: i + 1,
    Directory: path.relative(rootDir, d.path) || "(root)",
    Size: formatBytes(d.size),
    Bytes: d.size
  }));
  console.table(top20Dirs);
}

auditDisk();
