import { ipcMain, dialog, safeStorage, app, shell } from "electron";
import { expandHome } from "../helpers";
import * as fs from "fs";
import { listLogFiles, readLogFile, readLogFileFromOffset } from "../services/local-logs";
import { localWindow, runLocalSearch, type WindowTarget } from "../services/log-search";

export default () => {
  ipcMain.handle("open-file-dialog", (event, options) => {
    return dialog.showOpenDialog(options);
  });
  ipcMain.handle("read-file-from-path", (event, path) => {
    path = expandHome(path);
    return fs.readFileSync(path, "utf-8");
  });
  ipcMain.handle("read-log-file-from-path", (event, filePath: string, maxBytes: number) => {
    filePath = expandHome(filePath);
    return readLogFile(filePath, maxBytes);
  });
  ipcMain.handle("read-log-file-from-offset", (event, filePath: string, offset: number) => {
    filePath = expandHome(filePath);
    return readLogFileFromOffset(filePath, offset);
  });
  ipcMain.handle("search-log-file", (event, filePath: string, pattern: string, limit: number) => {
    return runLocalSearch(filePath, pattern, limit);
  });
  ipcMain.handle("log-window", (event, filePath: string, target: WindowTarget, bytes: number) => {
    return localWindow(filePath, target ?? {}, bytes);
  });
  ipcMain.handle("is-file-or-directory", (event, path) => {
    path = expandHome(path);
    if (!fs.existsSync) {
      return null;
    }
    return fs.lstatSync(path).isDirectory() ? "directory" : "file";
  });
  ipcMain.handle("get-files-in-directory", (event, directory: string) => {
    directory = expandHome(directory);
    return listLogFiles(directory);
  });
  ipcMain.handle("encrypt-string", (event, string) => {
    return safeStorage.encryptString(string).toString("base64");
  });
  ipcMain.handle("can-use-safe-storage", (event) => {
    return safeStorage.isEncryptionAvailable();
  });
  ipcMain.handle("open-folder-to-file", (event, fileName) => {
    let path = app.getPath("downloads") + "/" + fileName;
    return shell.showItemInFolder(path);
  });
  ipcMain.handle("open-downloads-folder", (event) => {
    return shell.openPath(app.getPath("downloads"));
  });
  ipcMain.handle("open-folder-from-path", (event, path) => {
    path = expandHome(path);
    return shell.openPath(path);
  });
};
