import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ports = process.argv.slice(2).length ? process.argv.slice(2) : ["5000", "5173", "5174"];
const projectRoot = process.cwd().toLowerCase();

async function netstat() {
  const { stdout } = await execFileAsync("netstat", ["-ano"], { windowsHide: true });
  return stdout;
}

function listenerPids(output) {
  const wanted = new Set(ports.map(String));
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || parts[0] !== "TCP" || parts[3] !== "LISTENING") continue;

    const localAddress = parts[1];
    const pid = parts[4];
    const port = localAddress.match(/:(\d+)$/)?.[1];

    if (wanted.has(port) && pid !== String(process.pid)) {
      pids.add(pid);
    }
  }

  return [...pids];
}

async function processTable() {
  try {
    const command = [
      "$ErrorActionPreference='Stop';",
      "Get-CimInstance Win32_Process |",
      "Select-Object ProcessId,ParentProcessId,Name,CommandLine |",
      "ConvertTo-Json -Compress"
    ].join(" ");
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", command], {
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024
    });
    const parsed = JSON.parse(stdout || "[]");
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function projectNodeAncestors(listenerIds, processes) {
  const byPid = new Map(processes.map((proc) => [String(proc.ProcessId), proc]));
  const targets = new Set(listenerIds);

  for (const listenerId of listenerIds) {
    let current = byPid.get(String(listenerId));
    const seen = new Set();

    while (current && !seen.has(String(current.ProcessId))) {
      seen.add(String(current.ProcessId));
      const parent = byPid.get(String(current.ParentProcessId));
      if (!parent) break;

      const commandLine = String(parent.CommandLine || "").toLowerCase();
      const name = String(parent.Name || "").toLowerCase();
      const isProjectNode = name === "node.exe" && commandLine.includes(projectRoot);

      if (isProjectNode && String(parent.ProcessId) !== String(process.pid)) {
        targets.add(String(parent.ProcessId));
        current = parent;
        continue;
      }
      break;
    }
  }

  return [...targets];
}

async function killPid(pid) {
  try {
    await execFileAsync("taskkill", ["/PID", pid, "/T", "/F"], { windowsHide: true });
    console.log(`Stopped process ${pid} listening on project dev port.`);
  } catch (error) {
    const message = error.stderr || error.stdout || error.message;
    console.warn(`Could not stop process ${pid}: ${message.trim()}`);
  }
}

const listenerIds = listenerPids(await netstat());
const pids = projectNodeAncestors(listenerIds, await processTable());

if (pids.length === 0) {
  console.log(`No listeners found on ports ${ports.join(", ")}.`);
} else {
  await Promise.all(pids.map(killPid));
}
