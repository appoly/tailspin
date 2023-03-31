import { ipcMain, safeStorage } from "electron";
import SSH2Promise from "ssh2-promise";

export default () => {
  ipcMain.handle("test-ssh-credentials", async (event, options) => {
    const ssh = new SSH2Promise({
      host: options.host,
      port: options.port,
      username: options.username,
      [options.passwordType === "password" ? "password" : "privateKey"]: options.password,
      readyTimeout: 4000,
      reconnect: false,
    });
    try {
      let res = await ssh.connect();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message ?? "Error has occurred" };
    } finally {
      ssh.close(); // I think this is fine to do even when it fails to connect. This is safer because it will ensure the connection is always closed.
    }
  });
  ipcMain.handle("ssh-is-file-or-directory", async (event, options, path: string) => {
    const ssh = buildConnection(options);
    try {
      await ssh.connect();
      // Determine whether the path is a file, directory, or does not exist:
      let response = await ssh.exec(`test -d ${path} && echo "directory" || (test -f ${path} && echo "file")`);
      return { success: true, message: response };
    } catch (err) {
      return { success: false, message: formatErrorToString(err) };
    } finally {
      ssh.close();
    }
  });
  ipcMain.handle("ssh-get-files-in-directory", async (event, options, path: string) => {
    const ssh = buildConnection(options);
    try {
      await ssh.connect();
      // Output one file per line:
      let response = await ssh.exec(`ls`, ["-1", path + "/*.log"]);
      return { success: true, message: response };
    } catch (err) {
      return { success: false, message: formatErrorToString(err) };
    } finally {
      ssh.close();
    }
  });
  ipcMain.handle("ssh-read-from-path", async (event, options, path: string) => {
    const ssh = buildConnection(options);
    try {
      await ssh.connect();
      // Read the last 100 lines of the file:
      let response = await ssh.exec(`tail -n 100`, [path]);
      return { success: true, message: response };
    } catch (err) {
      return { success: false, message: formatErrorToString(err) };
    } finally {
      ssh.close();
    }
  });
};

function formatErrorToString(err: any) {
  return typeof err === "string" ? err : err.message ?? "Error has occurred";
}
function decryptString(string: string) {
  let buffer = Buffer.from(string, "base64");
  return safeStorage.decryptString(buffer);
}

function buildConnection(options: any) {
  return new SSH2Promise({
    host: options.host,
    port: options.port,
    username: options.username,
    [options.passwordType === "password" ? "password" : "privateKey"]: decryptString(options.password),
    readyTimeout: 4000,
    reconnect: false,
  });
}
