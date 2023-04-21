import { ipcRenderer } from "electron";

/**
 * I'm not too happy with this interface and the one inside the interfaces file in src being so similar, but it works for now.
 */
interface SshDetails {
  host: string;
  port: number;
  username: string;
  passwordType: "password" | "key";
  password: string;
  passphrase?: string;
}

interface SshResponse {
  success: boolean;
  message?: string;
}

export function testSshCredentials(
  options: SshDetails,
  passwordIsEncrypted: boolean
): Promise<{ success: boolean; error?: any }> {
  return ipcRenderer.invoke("test-ssh-credentials", options, passwordIsEncrypted);
}

export function isFileOrDirectory(options: SshDetails, path: string): Promise<SshResponse> {
  return ipcRenderer.invoke("ssh-is-file-or-directory", options, path);
}

export function getFilesInDirectory(options: SshDetails, path: string): Promise<SshResponse> {
  return ipcRenderer.invoke("ssh-get-files-in-directory", options, path);
}

export function readFromPath(options: SshDetails, path: string): Promise<SshResponse> {
  return ipcRenderer.invoke("ssh-read-from-path", options, path);
}
