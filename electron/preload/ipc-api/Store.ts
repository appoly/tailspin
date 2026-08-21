import { ipcRenderer } from "electron";

export function get(key: string, defaultVal: any) {
  return ipcRenderer.invoke("config-get", key, defaultVal);
}
export function set(key: string, value: any) {
  return ipcRenderer.invoke("config-set", key, value);
}
export function has(key: string): Promise<boolean> {
  return ipcRenderer.invoke("config-has", key);
}
export function deleteByKey(key: string) {
  return ipcRenderer.invoke("config-delete", key);
}
export function clear() {
  return ipcRenderer.invoke("config-clear");
}

export interface ConfigTransferResult {
  success: boolean;
  canceled?: boolean;
  message?: string;
}

export function exportConfig(): Promise<ConfigTransferResult> {
  return ipcRenderer.invoke("config-export");
}
export function importConfig(): Promise<ConfigTransferResult> {
  return ipcRenderer.invoke("config-import");
}
export function hasLegacyConfig(): Promise<boolean> {
  return ipcRenderer.invoke("config-has-legacy");
}
export function restoreLegacyConfig(): Promise<ConfigTransferResult> {
  return ipcRenderer.invoke("config-restore-legacy");
}
