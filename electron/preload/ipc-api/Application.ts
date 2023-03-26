import { ipcRenderer, OpenDialogOptions, OpenDialogReturnValue } from "electron";

export default class {
  static openFileDialogue(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
    return ipcRenderer.invoke("open-file-dialog", options);
  }

  static readFromPath(path: string): Promise<string> {
    return ipcRenderer.invoke("read-file-from-path", path);
  }

  static isFileOrDirectory(path: string): Promise<"file" | "directory" | null> {
    return ipcRenderer.invoke("is-file-or-directory", path);
  }

  static getFilesInDirectory(path: string): Promise<string[]> {
    return ipcRenderer.invoke("get-files-in-directory", path);
  }
}
