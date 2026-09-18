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

/**
 * How an MCP client should start the shim. On macOS and Windows the binary and
 * the unpacked shim sit at stable paths. Inside a Linux AppImage neither does:
 * the image is mounted under a fresh /tmp/.mount_XXXXXX on every launch, so
 * process.execPath and the shim path are only valid until the app quits. The
 * AppImage runtime sets APPIMAGE (the stable file) and APPDIR (the mount) for
 * the process it starts, so the client runs the AppImage itself as Node and
 * requires the shim by a path built from APPDIR at run time. Node's -e leaves
 * no room for a positional argument, so the socket travels in the environment,
 * which the shim already accepts.
 */
function launch(socket: string): { command: string; args: string[]; env: Record<string, string> } {
  const appImage = process.platform === "linux" ? process.env.APPIMAGE : undefined;
  if (appImage) {
    return {
      command: appImage,
      args: ["-e", 'require(process.env.APPDIR + "/resources/app.asar.unpacked/dist-electron/mcp-shim/index.js")'],
      env: { ELECTRON_RUN_AS_NODE: "1", TAILSPIN_MCP_SOCKET: socket },
    };
  }
  return { command: process.execPath, args: [shimPath(), socket], env: { ELECTRON_RUN_AS_NODE: "1" } };
}

function status(): McpStatus {
  const socket = socketPath();
  const { command, args, env } = launch(socket);
  return {
    enabled: store().get("app.mcpEnabled", false) === true,
    running: isRunning(),
    socketPath: socket,
    claudeCodeCommand: [
      "claude mcp add tailspin",
      ...Object.entries(env).map(([key, value]) => `-e ${shellQuote(`${key}=${value}`)}`),
      "--",
      shellQuote(command),
      ...args.map(shellQuote),
    ].join(" "),
    jsonConfig: JSON.stringify({ mcpServers: { tailspin: { command, args, env } } }, null, 2),
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
