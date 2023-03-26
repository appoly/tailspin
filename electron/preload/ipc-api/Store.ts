import { ipcRenderer } from "electron";

export function get(key: string, defaultVal: any) {
  return ipcRenderer.invoke("config-get", key, defaultVal);
}
export function set(key: string, value: any) {
  return ipcRenderer.invoke("config-set", key, value);
}
export function has(key: string) {
  return ipcRenderer.invoke("config-has", key);
}
