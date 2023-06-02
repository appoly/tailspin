import { ipcMain, safeStorage, app } from "electron";
import SSH2Promise from "ssh2-promise";

export default () => {
  ipcMain.handle("test-ssh-credentials", async (event, options, passwordIsEncrypted: boolean) => {
    const ssh = buildConnection(options, passwordIsEncrypted);
    try {
      await ssh.connect();
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
      // Output one file per line, only .log files:
      // Only look for .log files
      path = path.endsWith("/") ? path + "*.log" : path + "/*.log";
      let response = await ssh.exec(`ls`, ["-1", path]);
      return { success: true, message: response };
    } catch (err) {
      return { success: false, message: formatErrorToString(err) };
    } finally {
      ssh.close();
    }
  });
  ipcMain.handle("ssh-read-from-path", async (event, options, path: string, numberOfLines = 1000) => {
    const ssh = buildConnection(options);
    try {
      await ssh.connect();
      if (numberOfLines > 200000) {
        numberOfLines = 1000; // Limit to 1000 lines if the user has somehow got above the max
      }
      let response = await ssh.exec(`tail -n`, [numberOfLines, path]);
      return { success: true, message: response };
    } catch (err) {
      return { success: false, message: formatErrorToString(err) };
    } finally {
      ssh.close();
    }
  });
  ipcMain.handle("ssh-download-from-path", async (event, options, path: string, fileName: string) => {
    const ssh = buildConnection(options);
    // Append the time to the file name, but before the .log, for uniqueness:
    fileName = fileName.replace(".log", `-${Date.now() * 1000}.log`);
    try {
      let sftp = ssh.sftp();
      await sftp.fastGet(path, app.getPath("downloads") + "/" + fileName);
      return { success: true, message: "Downloaded to Downloads folder" };
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

function buildConnection({ host, port, username, password, passwordType, passphrase = null }, decryptNeeded = true) {
  const config = {
    host,
    port,
    username,
    readyTimeout: 4000,
    reconnect: false,
    ...(passphrase && { passphrase }),
  };

  const decryptedPassword = decryptNeeded ? decryptString(password) : password;

  config[passwordType === "password" ? "password" : "identity"] = decryptedPassword;

  return new SSH2Promise(config);
}
