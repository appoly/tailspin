import { ipcRenderer } from "electron";

export function openExternal(url: string): Promise<{ success: boolean; message?: string }> {
  return ipcRenderer.invoke("open-external", url);
}
