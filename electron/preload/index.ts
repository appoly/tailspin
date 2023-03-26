import { contextBridge, ipcRenderer } from "electron";
import { domReady, useLoading } from "./loading";
import Application from "./ipc-api/Application";

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);

window.onmessage = (ev: MessageEvent<any>) => {
  ev.data.payload === "removeLoading" && removeLoading();
};

setTimeout(removeLoading, 4999);

contextBridge.exposeInMainWorld("api", {
  load: () => ipcRenderer.invoke("config-load"),
  get: (key: string, defaultValue) => ipcRenderer.invoke("config-get", key, defaultValue),
  set: (key: string, value) => ipcRenderer.invoke("config-set", key, value),
  has: (key: string) => ipcRenderer.invoke("config-has", key),
  Application,
});
