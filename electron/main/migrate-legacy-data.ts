import { app } from "electron";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// One-time migration from the app's pre-rename identity ("Laravel Log Viewer").
// The userData directory is derived from the app name, so the rename to
// Tailspin orphaned the old electron-store config. Copy it across, dropping
// values encrypted via safeStorage where the platform keys them to the app
// name (macOS keychain / Linux secret service) — the renamed app cannot
// decrypt those, so users re-enter them once. Windows DPAPI is app-agnostic,
// so encrypted values survive there.

const LEGACY_NAME = "Laravel Log Viewer";

export default function migrateLegacyUserData() {
  try {
    const legacyConfig = join(app.getPath("appData"), LEGACY_NAME, "config.json");
    const newDir = app.getPath("userData");
    const newConfig = join(newDir, "config.json");

    if (!existsSync(legacyConfig) || existsSync(newConfig)) return;

    const config = JSON.parse(readFileSync(legacyConfig, "utf-8"));

    if (process.platform !== "win32") {
      if (config.app?.forgeApiKey) delete config.app.forgeApiKey;
      if (Array.isArray(config.connections)) {
        for (const connection of config.connections) {
          if (connection?.ssh?.passwordType === "password") connection.ssh.password = "";
        }
      }
    }

    mkdirSync(newDir, { recursive: true });
    writeFileSync(newConfig, JSON.stringify(config, null, "\t"));
    console.log(`Migrated settings from "${LEGACY_NAME}" to "${app.getPath("userData")}"`);
  } catch (err) {
    console.error("Legacy userData migration failed:", err);
  }
}
