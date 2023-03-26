import { contextBridge, ipcRenderer } from "electron";
import { domReady, useLoading } from "./loading";
import api from "./ipc-api";

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);

window.onmessage = (ev: MessageEvent<any>) => {
  ev.data.payload === "removeLoading" && removeLoading();
};

setTimeout(removeLoading, 4999);

contextBridge.exposeInMainWorld("api", api);
