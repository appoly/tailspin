import { ipcRenderer } from "electron";

export const beginDrag = (): void => ipcRenderer.send("window-drag-begin");
export const moveDrag = (): void => ipcRenderer.send("window-drag-move");
export const endDrag = (): void => ipcRenderer.send("window-drag-end");
