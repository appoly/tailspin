import { ipcRenderer, OpenDialogOptions, OpenDialogReturnValue } from "electron";

export function getServerList(encryptedApiKey: string) {
  return ipcRenderer.invoke("get-server-list", encryptedApiKey);
}

export function getSiteList(encryptedApiKey: string) {
  return ipcRenderer.invoke("get-site-list", encryptedApiKey);
}
