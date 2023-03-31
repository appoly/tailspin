import { ipcMain } from "electron";
import SSH2Promise from "ssh2-promise";

export default () => {
  ipcMain.handle("test-ssh-credentials", async (event, options) => {
    const ssh = new SSH2Promise({
      host: options.host,
      port: options.port,
      username: options.username,
      readyTimeout: 2000,
      reconnect: false,
    });
    try {
      await ssh.connect();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message ?? "Error has occurred" };
    }
  });
};
