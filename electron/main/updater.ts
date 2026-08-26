import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

// Forwards electron-updater lifecycle events to the renderer and exposes
// check/download/install over IPC. Updates are downloaded only when the
// user asks, but a downloaded update installs itself on quit.
export default function setupAutoUpdater(getWindow: () => BrowserWindow | null) {
  const send = (channel: string, payload?: unknown) => {
    getWindow()?.webContents.send(channel, payload);
  };

  if (app.isPackaged) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("checking-for-update", () => send("updater:checking"));
    autoUpdater.on("update-available", (info) =>
      send("updater:available", { version: info.version, releaseNotes: info.releaseNotes })
    );
    autoUpdater.on("update-not-available", () => send("updater:not-available"));
    autoUpdater.on("download-progress", (progress) =>
      send("updater:progress", {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        total: progress.total,
        transferred: progress.transferred,
      })
    );
    autoUpdater.on("update-downloaded", () => send("updater:downloaded"));
    autoUpdater.on("error", (err) => send("updater:error", err.message));

    // Check once shortly after launch. The feed is the repo's GitHub releases
    // (see publish in electron-builder.json5), so a failed check is harmless.
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
  }

  ipcMain.handle("updater:check", () => {
    if (!app.isPackaged) return;
    return autoUpdater.checkForUpdates().catch(() => {});
  });
  ipcMain.handle("updater:download", () => autoUpdater.downloadUpdate().catch(() => {}));
  ipcMain.handle("updater:install", () => autoUpdater.quitAndInstall());
  ipcMain.handle("updater:version", () => app.getVersion());
}
