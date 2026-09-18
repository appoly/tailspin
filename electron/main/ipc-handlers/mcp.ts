import { app, ipcMain } from "electron";
import { join } from "node:path";
import { store } from "./store";
import { isRunning, lastStartError, socketPath, startMcpSocketServer, stopMcpSocketServer } from "../mcp/socket-server";

import type { McpStatus } from "../../../shared/mcp";

/** The shim script, unpacked from the asar so a plain Node process can load it. */
function shimPath(): string {
  const distElectron = process.env.DIST_ELECTRON ?? join(__dirname, "..");
  return join(distElectron, "mcp-shim", "index.js").replace(/app\.asar([\\/])/, "app.asar.unpacked$1");
}

/** Quote for a POSIX shell or PowerShell; both accept double quotes around a path with spaces. */
function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./\\-]+$/.test(value)) return value;
  return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

function status(): McpStatus {
  const exec = process.execPath;
  const shim = shimPath();
  const socket = socketPath();
  return {
    enabled: store().get("app.mcpEnabled", false) === true,
    running: isRunning(),
    socketPath: socket,
    claudeCodeCommand: [
      "claude mcp add tailspin -e ELECTRON_RUN_AS_NODE=1 --",
      shellQuote(exec),
      shellQuote(shim),
      shellQuote(socket),
    ].join(" "),
    jsonConfig: JSON.stringify(
      {
        mcpServers: {
          tailspin: { command: exec, args: [shim, socket], env: { ELECTRON_RUN_AS_NODE: "1" } },
        },
      },
      null,
      2
    ),
    error: lastStartError(),
  };
}

export default () => {
  ipcMain.handle("mcp-get-status", () => status());
  ipcMain.handle("mcp-set-enabled", async (event, enabled: boolean) => {
    store().set("app.mcpEnabled", enabled === true);
    if (enabled) {
      await startMcpSocketServer().catch(() => {});
    } else {
      stopMcpSocketServer();
    }
    return status();
  });

  app.whenReady().then(() => {
    if (store().get("app.mcpEnabled", false) === true) {
      startMcpSocketServer().catch(() => {});
    }
  });
  app.on("before-quit", stopMcpSocketServer);
};
