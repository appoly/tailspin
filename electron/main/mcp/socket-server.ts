import { app } from "electron";
import * as net from "node:net";
import { chmodSync, existsSync, unlinkSync } from "node:fs";
import { mcpSocketPath } from "../../../shared/mcpSocket";
import { McpToolNames, type McpSocketRequest, type McpSocketResponse } from "../../../shared/mcp";
import { McpToolError, runTool } from "./tools";

// The app end of the MCP bridge. Listens on a per-user local socket and answers
// one newline-delimited JSON request per connection. The other end is the shim
// in electron/mcp-shim, spawned by whichever MCP client the user registered.

const MaxRequestBytes = 64 * 1024;

let server: net.Server | null = null;
let lastError: string | null = null;

export function socketPath(): string {
  return mcpSocketPath(app.getPath("userData"));
}

export function isRunning(): boolean {
  return server !== null && server.listening;
}

export function lastStartError(): string | null {
  return lastError;
}

export async function startMcpSocketServer(): Promise<void> {
  if (server) return;
  const path = socketPath();
  lastError = null;

  // A previous instance that crashed leaves its socket file behind. Nothing
  // else can be listening on it because the single-instance lock is ours.
  if (process.platform !== "win32" && existsSync(path)) {
    try {
      unlinkSync(path);
    } catch {}
  }

  const created = net.createServer(handleConnection);
  server = created;

  await new Promise<void>((resolve, reject) => {
    created.once("error", (err) => {
      lastError = err.message;
      server = null;
      reject(err);
    });
    created.listen(path, () => {
      if (process.platform !== "win32") {
        try {
          chmodSync(path, 0o600);
        } catch {}
      }
      resolve();
    });
  });

  created.on("error", (err) => {
    lastError = err.message;
  });
}

export function stopMcpSocketServer(): void {
  const current = server;
  server = null;
  if (!current) return;
  current.close();
  if (process.platform !== "win32") {
    try {
      unlinkSync(socketPath());
    } catch {}
  }
}

function handleConnection(socket: net.Socket) {
  let buffer = "";
  let answered = false;
  let processing = false;

  const reply = (response: McpSocketResponse) => {
    if (answered) return;
    answered = true;
    socket.end(JSON.stringify(response) + "\n");
  };

  socket.setEncoding("utf8");
  socket.on("data", async (chunk: string) => {
    if (answered || processing) return;
    buffer += chunk;
    if (buffer.length > MaxRequestBytes) {
      reply({ id: "", ok: false, error: "Request too large." });
      return;
    }
    const newline = buffer.indexOf("\n");
    if (newline === -1) return;
    processing = true;

    let request: McpSocketRequest;
    try {
      request = JSON.parse(buffer.slice(0, newline));
    } catch {
      reply({ id: "", ok: false, error: "Malformed request." });
      return;
    }

    const id = typeof request?.id === "string" ? request.id : "";
    if (!McpToolNames.includes(request?.tool)) {
      reply({ id, ok: false, error: `Unknown tool '${String(request?.tool)}'.` });
      return;
    }

    try {
      const result = await runTool(request.tool, request.args ?? {});
      reply({ id, ok: true, result });
    } catch (err: any) {
      const message = err instanceof McpToolError ? err.message : err?.message ?? String(err);
      reply({ id, ok: false, error: message });
    }
  });
  socket.on("error", () => {});
}
