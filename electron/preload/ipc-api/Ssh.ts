import { ipcRenderer } from "electron";
import { SshDetailsToIpc, SshIpcResponse } from "../../../shared/interfaces";
import type { SearchOutcome, WindowRead } from "../../../shared/search";

export interface WindowTarget {
  targetMs?: number;
  offset?: number;
}

export function testSshCredentials(options: SshDetailsToIpc, passwordIsEncrypted: boolean): Promise<SshIpcResponse> {
  return ipcRenderer.invoke("test-ssh-credentials", options, passwordIsEncrypted);
}

export function isFileOrDirectory(options: SshDetailsToIpc, path: string): Promise<SshIpcResponse> {
  return ipcRenderer.invoke("ssh-is-file-or-directory", options, path, doesPasswordNeedDecrypting(options));
}

export function getFilesInDirectory(options: SshDetailsToIpc, path: string): Promise<SshIpcResponse> {
  return ipcRenderer.invoke("ssh-get-files-in-directory", options, path, doesPasswordNeedDecrypting(options));
}

export async function readFromPath(
  options: SshDetailsToIpc,
  path: string,
  numberOfBytesOverride?: number
): Promise<SshIpcResponse & { fileSize: string }> {
  let bytes = numberOfBytesOverride ?? (await ipcRenderer.invoke("config-get", "ssh.numberOfBytes"));
  return ipcRenderer.invoke("ssh-read-from-path", options, path, doesPasswordNeedDecrypting(options), bytes);
}

export async function readNextFromPath(
  options: SshDetailsToIpc,
  path: string,
  fileSizeAtLastReadBytes: number
): Promise<SshIpcResponse & { fileSize: string }> {
  return ipcRenderer.invoke(
    "ssh-read-next-from-path",
    options,
    path,
    doesPasswordNeedDecrypting(options),
    fileSizeAtLastReadBytes
  );
}

export async function downloadFromPath(
  options: SshDetailsToIpc,
  path: string,
  fileName: string
): Promise<SshIpcResponse> {
  return ipcRenderer.invoke("ssh-download-from-path", options, path, doesPasswordNeedDecrypting(options), fileName);
}

/** Bounded whole-file search; see shared/search.ts for the limits it enforces. */
export function searchFile(options: SshDetailsToIpc, path: string, pattern: string, limit: number): Promise<SearchOutcome> {
  return ipcRenderer.invoke("ssh-search-file", options, path, doesPasswordNeedDecrypting(options), pattern, limit);
}

/** A slice of the file centred on a time, or starting at an offset. */
export function readWindow(options: SshDetailsToIpc, path: string, target: WindowTarget, bytes: number): Promise<WindowRead> {
  return ipcRenderer.invoke("ssh-window", options, path, doesPasswordNeedDecrypting(options), target, bytes);
}

function doesPasswordNeedDecrypting(options: SshDetailsToIpc): boolean {
  return options.passwordType === "password";
}
