import { ipcRenderer, OpenDialogOptions, OpenDialogReturnValue } from "electron";

export default class {
  static openFileDialogue(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
    return ipcRenderer.invoke("open-file-dialog", options);
  }

  static readFromPath(path: string): Promise<string> {
    return ipcRenderer.invoke("read-from-path", path);
  }
}
