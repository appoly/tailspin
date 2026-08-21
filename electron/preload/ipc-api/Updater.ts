import { ipcRenderer } from "electron";

export interface UpdateInfoPayload {
  version: string;
  releaseNotes?: unknown;
}

export interface UpdateProgressPayload {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

export function check(): Promise<void> {
  return ipcRenderer.invoke("updater:check");
}

export function download(): Promise<void> {
  return ipcRenderer.invoke("updater:download");
}

export function install(): Promise<void> {
  return ipcRenderer.invoke("updater:install");
}

export function version(): Promise<string> {
  return ipcRenderer.invoke("updater:version");
}

function on<T>(channel: string): (callback: (payload: T) => void) => () => void {
  return (callback) => {
    const handler = (_event: unknown, payload: T) => callback(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  };
}

export const onChecking = on<void>("updater:checking");
export const onAvailable = on<UpdateInfoPayload>("updater:available");
export const onNotAvailable = on<void>("updater:not-available");
export const onProgress = on<UpdateProgressPayload>("updater:progress");
export const onDownloaded = on<void>("updater:downloaded");
export const onError = on<string>("updater:error");
