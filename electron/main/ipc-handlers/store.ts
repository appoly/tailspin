import { ipcMain } from "electron";
import Store from "electron-store";

// Lazy so the legacy-userData migration can run before the file is created
let _store: Store | undefined;
const store = new Proxy({} as Store, {
  get(_target, prop) {
    _store ??= new Store();
    const value = (_store as any)[prop];
    return typeof value === "function" ? value.bind(_store) : value;
  },
});

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
  ipcMain.handle("config-delete", (event, key) => {
    store.delete(key);
  });
  ipcMain.handle("config-clear", () => {
    store.clear();
  });
};
