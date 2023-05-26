import { ipcRenderer, OpenDialogOptions, OpenDialogReturnValue } from "electron";

export function openFileDialogue(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  return ipcRenderer.invoke("open-file-dialog", options);
}

export function readFromPath(path: string): Promise<string> {
  return ipcRenderer.invoke("read-file-from-path", path);
}

export function isFileOrDirectory(path: string): Promise<"file" | "directory" | null> {
  return ipcRenderer.invoke("is-file-or-directory", path);
}

export function getFilesInDirectory(path: string): Promise<string[]> {
  return ipcRenderer.invoke("get-files-in-directory", path);
}

export function encryptString(string: string): Promise<string> {
  return ipcRenderer.invoke("encrypt-string", string);
}

export function canUseSafeStorage(): Promise<boolean> {
  return ipcRenderer.invoke("can-use-safe-storage");
}
