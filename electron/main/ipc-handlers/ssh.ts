import { ipcMain, app } from "electron";
import type { SshDetailsToIpc } from "../../../shared/interfaces";
import {
  closeAllConnections,
  isCompressedPath,
  listDirectoryRaw,
  pathType,
  readSince,
  readTail,
  withSsh,
} from "../services/ssh";

export default () => {
  ipcMain.handle("test-ssh-credentials", async (event, options, passwordIsEncrypted: boolean) =>
    withSsh(
      () => Promise.resolve({ success: true }), // Simply by getting here, we know the credentials are valid, so return true
      options,
      passwordIsEncrypted
    )
  );
  ipcMain.handle("ssh-is-file-or-directory", async (event, options, path: string, passwordIsEncrypted: boolean) =>
    withSsh(async (ssh) => ({ success: true, message: await pathType(ssh, path) }), options, passwordIsEncrypted)
  );
  ipcMain.handle("ssh-get-files-in-directory", async (event, options, path: string, passwordIsEncrypted: boolean) =>
    withSsh(
      // The renderer parses all three columns itself, so nothing is stripped here.
      async (ssh) => ({ success: true, message: await listDirectoryRaw(ssh, path) }),
      options,
      passwordIsEncrypted
    )
  );
  ipcMain.handle(
    "ssh-read-from-path",
    async (event, options, path: string, passwordIsEncrypted: boolean, numberOfBytes = 10000) =>
      withSsh((ssh) => readTail(ssh, path, numberOfBytes), options, passwordIsEncrypted)
  );
  ipcMain.handle(
    "ssh-read-next-from-path",
    async (event, options, path: string, passwordIsEncrypted: boolean, fileSizeAtLastReadInBytes: number) => {
      // A gzip stream has no meaningful byte offset to resume from, and a rotated
      // file will not grow anyway. Refuse before spending a connection on it.
      if (isCompressedPath(path)) {
        return { success: false, message: "Auto-fetch is not available for compressed files." };
      }
      return withSsh((ssh) => readSince(ssh, path, fileSizeAtLastReadInBytes), options, passwordIsEncrypted);
    }
  );
  ipcMain.handle(
    "ssh-download-from-path",
    async (event, options: SshDetailsToIpc, path: string, passwordIsEncrypted: boolean, fileName: string) =>
      withSsh(
        async (ssh) => {
          // sftp talks the protocol directly, so the path never reaches a shell.
          const sftp = ssh.sftp();
          // No shell here either, so "~" is resolved against the login directory.
          const remotePath = /^~(\/|$)/.test(path) ? path.replace(/^~/, await sftp.realpath(".")) : path;
          await sftp.fastGet(remotePath, app.getPath("downloads") + "/" + fileName);
          return { success: true, message: "Downloaded to Downloads folder" };
        },
        options,
        passwordIsEncrypted
      )
  );

  // Nothing should outlive the app, including a socket sitting out its idle timeout.
  app.on("before-quit", closeAllConnections);
  app.on("window-all-closed", closeAllConnections);
};
