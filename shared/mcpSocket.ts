// Where the app listens for the MCP shim. Node-only: imported by the main
// process and the shim, never by the renderer.
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Unix domain socket inside userData (mode 0600, so only this user can reach
 * it). Windows has no filesystem sockets, so a named pipe scoped by a hash of
 * the same directory does the job there.
 */
export function mcpSocketPath(userDataDir: string): string {
  if (process.platform === "win32") {
    const hash = createHash("sha1").update(userDataDir).digest("hex").slice(0, 12);
    return `\\\\.\\pipe\\tailspin-mcp-${hash}`;
  }
  return join(userDataDir, "mcp.sock");
}

/**
 * Best guess at a packaged install's userData when the shim was started
 * without being told. Mirrors Electron's app.getPath("userData") for the
 * production app name; the generated config always passes the real path.
 */
export function defaultUserDataDir(appName = "Tailspin"): string {
  const home = homedir();
  switch (process.platform) {
    case "darwin":
      return join(home, "Library", "Application Support", appName);
    case "win32":
      return join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), appName);
    default:
      return join(process.env.XDG_CONFIG_HOME ?? join(home, ".config"), appName);
  }
}
