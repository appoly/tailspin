// Adapter exposing the same backend API surface the UI was written against,
// implemented over the Electron preload bridge (window.api).

import type { OpenDialogOptions } from "electron";
import type { LocalLogRead, LocalLogTailRead, LogFile, SshRequest, SshResponse } from "@/types/interfaces";

const bridge = window.api;

export async function ClipboardSetText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function ClipboardGetText(): Promise<string> {
  return navigator.clipboard.readText();
}

export const CryptoAPI = {
  EncryptString(plaintext: string): Promise<string> {
    return bridge.Application.encryptString(plaintext);
  },
  IsEncryptionAvailable(): Promise<boolean> {
    return bridge.Application.canUseSafeStorage();
  },
};

export const StorageAPI = {
  Get(key: string, defaultValue: any = null): Promise<any> {
    return bridge.Store.get(key, defaultValue);
  },
  Set(key: string, value: any): Promise<void> {
    return bridge.Store.set(key, value);
  },
  Has(key: string): Promise<boolean> {
    return bridge.Store.has(key);
  },
  Delete(key: string): Promise<void> {
    return bridge.Store.deleteByKey(key);
  },
  Clear(): Promise<void> {
    return bridge.Store.clear();
  },
};

async function pickPath(options: OpenDialogOptions): Promise<string> {
  const result = await bridge.Application.openFileDialogue(options);
  return result.canceled ? "" : result.filePaths[0] ?? "";
}

export const FileAPI = {
  OpenFileDialog(): Promise<string> {
    return pickPath({
      properties: ["openFile"],
      filters: [
        { name: "Log files", extensions: ["log", "txt"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
  },
  OpenAnyFileDialog(title = "Select a file"): Promise<string> {
    return pickPath({ title, properties: ["openFile", "showHiddenFiles"] });
  },
  OpenDirectoryDialog(): Promise<string> {
    return pickPath({ properties: ["openDirectory"] });
  },
  ReadFile(path: string): Promise<string> {
    return bridge.Application.readFromPath(path);
  },
  // Gunzips .gz files and tails anything oversized, unlike ReadFile.
  ReadLogFile(path: string, maxBytes?: number): Promise<LocalLogRead> {
    return bridge.Application.readLogFromPath(path, maxBytes);
  },
  // Only what was appended past `offset`, so an auto-fetch tick does not re-read the file.
  ReadLogFileFromOffset(path: string, offset: number): Promise<LocalLogTailRead> {
    return bridge.Application.readLogFromOffset(path, offset);
  },
  async IsFileOrDirectory(path: string): Promise<string> {
    return (await bridge.Application.isFileOrDirectory(path)) ?? "";
  },
  GetLogFilesInDirectory(path: string): Promise<LogFile[]> {
    return bridge.Application.getFilesInDirectory(path);
  },
  OpenFolderToFile(fileName: string): Promise<void> {
    return bridge.Application.openFolderToFile(fileName);
  },
  async OpenDownloadsFolder(): Promise<void> {
    await bridge.Application.openDownloadsFolder();
  },
  async OpenFolderFromPath(path: string): Promise<void> {
    await bridge.Application.openFolderFromPath(path);
  },
};

export const SshAPI = {
  TestConnection(req: SshRequest): Promise<SshResponse> {
    return bridge.Ssh.testSshCredentials(req, req.passwordIsEncrypted ?? false);
  },
  IsFileOrDirectory(req: SshRequest, path: string): Promise<SshResponse> {
    return bridge.Ssh.isFileOrDirectory(req, path);
  },
  GetFilesInDirectory(req: SshRequest, path: string): Promise<SshResponse> {
    return bridge.Ssh.getFilesInDirectory(req, path);
  },
  ReadFromPath(req: SshRequest, path: string, numberOfBytes: number): Promise<SshResponse> {
    return bridge.Ssh.readFromPath(req, path, numberOfBytes);
  },
  ReadNextFromPath(req: SshRequest, path: string, lastReadBytes: number): Promise<SshResponse> {
    return bridge.Ssh.readNextFromPath(req, path, lastReadBytes);
  },
  DownloadFile(req: SshRequest, remotePath: string, fileName: string): Promise<SshResponse> {
    return bridge.Ssh.downloadFromPath(req, remotePath, fileName);
  },
};

function throwOnForgeError<T extends { error?: string }>(response: T): T {
  if (response && typeof response === "object" && "error" in response && response.error) {
    throw new Error(response.error);
  }
  return response;
}

export const ConfigAPI = {
  Export: () => bridge.Store.exportConfig(),
  Import: () => bridge.Store.importConfig(),
  HasLegacy: () => bridge.Store.hasLegacyConfig(),
  RestoreLegacy: () => bridge.Store.restoreLegacyConfig(),
};

export const UpdaterAPI = {
  Check: () => bridge.Updater.check(),
  Download: () => bridge.Updater.download(),
  Install: () => bridge.Updater.install(),
  Version: () => bridge.Updater.version(),
  OnChecking: (cb: () => void) => bridge.Updater.onChecking(cb),
  OnAvailable: (cb: (info: { version: string }) => void) => bridge.Updater.onAvailable(cb),
  OnNotAvailable: (cb: () => void) => bridge.Updater.onNotAvailable(cb),
  OnProgress: (cb: (p: { percent: number }) => void) => bridge.Updater.onProgress(cb),
  OnDownloaded: (cb: () => void) => bridge.Updater.onDownloaded(cb),
  OnError: (cb: (message: string) => void) => bridge.Updater.onError(cb),
};

export const ForgeAPI = {
  async GetServers(encryptedApiKey: string): Promise<any> {
    return throwOnForgeError(await bridge.Forge.getServerList(encryptedApiKey));
  },
  async GetSites(encryptedApiKey: string): Promise<any> {
    return throwOnForgeError(await bridge.Forge.getSiteList(encryptedApiKey));
  },
};
