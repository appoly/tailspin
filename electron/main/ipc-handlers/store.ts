import { ipcMain } from "electron";
import Store from "electron-store";
const store = new Store();

export default () => {
  ipcMain.handle("config-get", (event, key, defaultValue) => {
    return store.get(key, defaultValue);
  });
  ipcMain.handle("config-set", (event, key, value) => {
    store.set(key, value);
  });
  ipcMain.handle("config-has", (event, key) => {
    return store.has(key);
  });
};
