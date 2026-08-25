import { app, dialog, ipcMain } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Store from "electron-store";

// Lazily constructed: electron-store resolves its path at construction time,
// and in dev that path is redirected (see electron/main/user-data.ts).
let storeInstance: Store | null = null;
function store(): any {
  if (!storeInstance) storeInstance = new Store();
  return storeInstance;
}

// Secrets never travel in config files: exported files must be safe to share,
// and encrypted values from another install couldn't be decrypted here anyway
// (safeStorage keys are per-app OS keychain entries).
function stripSecrets(config: any): any {
  if (config?.app?.forgeApiKey) delete config.app.forgeApiKey;
  if (Array.isArray(config?.connections)) {
    for (const connection of config.connections) {
      if (connection?.ssh?.passwordType === "password") connection.ssh.password = "";
    }
  }
  return config;
}

async function exportConfig() {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Export Tailspin config",
    defaultPath: join(app.getPath("downloads"), "tailspin-config.json"),
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (canceled || !filePath) return { success: false, canceled: true };

  const data = stripSecrets(JSON.parse(JSON.stringify(store().store)));
  writeFileSync(filePath, JSON.stringify(data, null, "\t"));
  return { success: true, message: `Exported to ${filePath}` };
}

async function importConfig() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Import Tailspin config",
    properties: ["openFile", "showHiddenFiles"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (canceled || !filePaths[0]) return { success: false, canceled: true };

  return applyConfigFile(filePaths[0]);
}

function applyConfigFile(path: string) {
  let imported: any;
  try {
    imported = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return { success: false, message: "That file is not valid JSON." };
  }
  if (typeof imported !== "object" || imported === null || !("connections" in imported || "app" in imported || "forge" in imported)) {
    return { success: false, message: "That file does not look like a Tailspin config." };
  }

  // Also accepts a raw config.json from an old install — its encrypted values
  // are stripped just like exports are.
  imported = stripSecrets(imported);

  // Merge app settings over current ones so an existing Forge key survives;
  // connections and forge lists are replaced wholesale.
  if (imported.app) store().set("app", { ...(store().get("app") ?? {}), ...imported.app });
  if (imported.connections) store().set("connections", imported.connections);
  if (imported.forge) store().set("forge", imported.forge);
  if (imported.ssh) store().set("ssh", imported.ssh);

  const count = Array.isArray(imported.connections) ? imported.connections.length : 0;
  return { success: true, message: `Imported ${count} connection${count === 1 ? "" : "s"}.` };
}

// The app was previously named "Laravel Log Viewer"; its config lives in a
// differently-named userData directory and its safeStorage secrets are
// unreadable here, so restoring reuses the import path (secrets stripped).
const LEGACY_CONFIG_PATH = join(app.getPath("appData"), "Laravel Log Viewer", "config.json");

export default () => {
  ipcMain.handle("config-get", (event, key, defaultValue) => {
    return store().get(key, defaultValue);
  });
  ipcMain.handle("config-set", (event, key, value) => {
    store().set(key, value);
  });
  ipcMain.handle("config-has", (event, key) => {
    return store().has(key);
  });
  ipcMain.handle("config-delete", (event, key) => {
    store().delete(key);
  });
  ipcMain.handle("config-clear", () => {
    store().clear();
  });
  ipcMain.handle("config-export", () => exportConfig());
  ipcMain.handle("config-import", () => importConfig());
  ipcMain.handle("config-has-legacy", () => existsSync(LEGACY_CONFIG_PATH));
  ipcMain.handle("config-restore-legacy", () => applyConfigFile(LEGACY_CONFIG_PATH));
};
