import { ipcMain, dialog, safeStorage } from "electron";
import * as fs from "fs";

export default () => {
  ipcMain.handle("open-file-dialog", (event, options) => {
    return dialog.showOpenDialog(options);
  });
  ipcMain.handle("read-file-from-path", (event, path) => {
    return fs.readFileSync(path, "utf-8");
  });
  ipcMain.handle("is-file-or-directory", (event, path) => {
    if (!fs.existsSync) {
      return null;
    }
    return fs.lstatSync(path).isDirectory() ? "directory" : "file";
  });
  ipcMain.handle("get-files-in-directory", (event, path) => {
    return fs.readdirSync(path)?.filter((file) => file.endsWith(".log"));
  });
  ipcMain.handle("encrypt-string", (event, string) => {
    return safeStorage.encryptString(string);
  });
  ipcMain.handle("decrypt-string", (event, string) => {
    return safeStorage.decryptString(string);
  });
};
