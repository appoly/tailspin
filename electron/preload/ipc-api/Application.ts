import { ipcRenderer, OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { LocalLogRead, LocalLogTailRead, LogFile } from "../../../shared/interfaces";

export function openFileDialogue(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  return ipcRenderer.invoke("open-file-dialog", options);
}

export function readFromPath(path: string): Promise<string> {
  return ipcRenderer.invoke("read-file-from-path", path);
}

/**
 * Read a log file, gunzipping it if needed and keeping only the last `maxBytes`.
 * Falls back to the configured SSH byte budget so local and remote reads agree.
 */
export async function readLogFromPath(path: string, maxBytesOverride?: number): Promise<LocalLogRead> {
  const maxBytes = maxBytesOverride ?? (await ipcRenderer.invoke("config-get", "ssh.numberOfBytes", 500 * 1024));
  return ipcRenderer.invoke("read-log-file-from-path", path, maxBytes);
}

/** Just the bytes appended since `offset`, for auto-fetch ticks. */
export function readLogFromOffset(path: string, offset: number): Promise<LocalLogTailRead> {
  return ipcRenderer.invoke("read-log-file-from-offset", path, offset);
}

export function isFileOrDirectory(path: string): Promise<"file" | "directory" | null> {
  return ipcRenderer.invoke("is-file-or-directory", path);
}

export function getFilesInDirectory(path: string): Promise<LogFile[]> {
  return ipcRenderer.invoke("get-files-in-directory", path);
}

export function encryptString(string: string): Promise<string> {
  return ipcRenderer.invoke("encrypt-string", string);
}

export function canUseSafeStorage(): Promise<boolean> {
  return ipcRenderer.invoke("can-use-safe-storage");
}

export function openFolderToFile(fileName: string): Promise<void> {
  return ipcRenderer.invoke("open-folder-to-file", fileName);
}

export function openDownloadsFolder(): Promise<string> {
  return ipcRenderer.invoke("open-downloads-folder");
}

export function openFolderFromPath(path: string): Promise<void> {
  return ipcRenderer.invoke("open-folder-from-path", path);
}
