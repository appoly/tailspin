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
};

function decryptString(event, string) {
  let buffer = Buffer.from(string, "base64");
  console.log(buffer);

  return safeStorage.decryptString(buffer);
}
