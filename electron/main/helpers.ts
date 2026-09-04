import { safeStorage } from "electron";
import { homedir } from "node:os";
import { join } from "node:path";

export function decryptString(string: string) {
  let buffer = Buffer.from(string, "base64");
  return safeStorage.decryptString(buffer);
}

/** Expand a leading "~" the way a shell would; Node's fs and ssh2 take paths literally. */
export function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}
