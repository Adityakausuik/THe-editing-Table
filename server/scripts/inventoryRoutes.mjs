import fs from "fs";
import path from "path";

const routesDir = path.resolve("./server/src/routes");
const files = fs.readdirSync(routesDir).filter(f => f.endsWith(".js") && !f.includes(".test."));

console.log("Scanning route files in:", routesDir);

const routeInventory = [];

for (const file of files) {
  const filePath = path.join(routesDir, file);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    const match = line.match(/router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/i);
    if (match) {
      routeInventory.push({ file, method: match[1].toUpperCase(), route: match[2], line: idx + 1 });
    }
  });
}

// Also scan app.js for direct mounts
const appPath = path.resolve("./server/src/app.js");
const appContent = fs.readFileSync(appPath, "utf8");
const appLines = appContent.split("\n");
const mounts = [];
appLines.forEach((line, idx) => {
  const mMatch = line.match(/app\.use\(\s*[`"']([^`"']+)`?['"]?\s*,\s*(\w+)\)/);
  if (mMatch) {
    mounts.push({ prefix: mMatch[1], router: mMatch[2], line: idx + 1 });
  }
  const directMatch = line.match(/app\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/i);
  if (directMatch) {
    routeInventory.push({ file: "app.js", method: directMatch[1].toUpperCase(), route: directMatch[2], line: idx + 1 });
  }
});

console.log(`\nFound ${routeInventory.length} total route declarations.`);
console.table(routeInventory);
console.log(`\nFound ${mounts.length} router mounts in app.js:`);
console.table(mounts);
