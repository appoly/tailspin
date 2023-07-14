import { ipcRenderer } from "electron";
import { SshDetailsToIpc, SshIpcResponse } from "../../../shared/interfaces";

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

function doesPasswordNeedDecrypting(options: SshDetailsToIpc): boolean {
  return options.passwordType === "password";
}
