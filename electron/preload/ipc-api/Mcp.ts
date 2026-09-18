import { ipcRenderer } from "electron";
import type { McpStatus } from "../../../shared/mcp";

export type { McpStatus };

export function getStatus(): Promise<McpStatus> {
  return ipcRenderer.invoke("mcp-get-status");
}

export function setEnabled(enabled: boolean): Promise<McpStatus> {
  return ipcRenderer.invoke("mcp-set-enabled", enabled);
}
