import { ipcMain, safeStorage, app } from "electron";
import SSH2Promise from "ssh2-promise";
import { SshDetailsToIpc } from "../../../shared/interfaces";

export default () => {
  ipcMain.handle("test-ssh-credentials", async (event, options, passwordIsEncrypted: boolean) =>
    handleSsh(
      () => Promise.resolve({ success: true }), // Simply by getting here, we know the credentials are valid, so return true
      options,
      passwordIsEncrypted
    )
  );
  ipcMain.handle("ssh-is-file-or-directory", async (event, options, path: string, passwordIsEncrypted: boolean) =>
    handleSsh(
      async (ssh) => {
        // Determine whether the path is a file, directory, or does not exist:
        let response = await ssh.exec(`test -d ${path} && echo "directory" || (test -f ${path} && echo "file")`);
        return { success: true, message: response };
      },
      options,
      passwordIsEncrypted
    )
  );
  ipcMain.handle("ssh-get-files-in-directory", async (event, options, path: string, passwordIsEncrypted: boolean) =>
    handleSsh(
      async (ssh) => {
        // Output one file per line, only .log files:
        // Only look for .log files
        path = path.endsWith("/") ? path + "*.log" : path + "/*.log";
        let response = await ssh.exec("ls -1sr", [path]);
        return { success: true, message: response };
      },
      options,
      passwordIsEncrypted
    )
  );
  ipcMain.handle(
    "ssh-read-from-path",
    async (event, options, path: string, passwordIsEncrypted: boolean, numberOfBytes = 1000) =>
      handleSsh(
        async (ssh) => {
          let response = "";
          // If number of bytes is 0, it means read the entire file with tail:
          if (numberOfBytes === 0) {
            response = await ssh.exec(`tail`, ["-n", "+1", path]);
          } else {
            response = await ssh.exec(`tail -c`, [numberOfBytes, path]);
          }
          // Also get the file size in Kilobytes to help with loading the next x bytes etc:
          let fileSize = await ssh.exec(`du -k`, [path]);
          return { success: true, message: response, fileSize };
        },
        options,
        passwordIsEncrypted
      )
  );
  ipcMain.handle(
    "ssh-download-from-path",
    async (event, options, path: string, passwordIsEncrypted: boolean, fileName: string) =>
      handleSsh(
        async (ssh) => {
          let sftp = ssh.sftp();
          await sftp.fastGet(path, app.getPath("downloads") + "/" + fileName);
          return { success: true, message: "Downloaded to Downloads folder" };
        },
        options,
        passwordIsEncrypted
      )
  );
};

function formatErrorToString(err: any) {
  return typeof err === "string" ? err : err.message ?? "Error has occurred";
}

function decryptString(string: string) {
  let buffer = Buffer.from(string, "base64");
  return safeStorage.decryptString(buffer);
}

function buildConnection(
  { host, port, username, password, passwordType, passphrase = null }: SshDetailsToIpc,
  decryptNeeded: boolean = true
) {
  const config = {
    host,
    port,
    username,
    readyTimeout: 4000,
    reconnect: false,
    ...(passphrase && { passphrase }), // Only add passphrase if it exists
  };

  if (decryptNeeded && !safeStorage.isEncryptionAvailable()) {
    throw new Error("Cannot decrypt password, safe storage is not available.");
  }

  const decryptedPassword = decryptNeeded ? decryptString(password) : password;

  config[passwordType === "password" ? "password" : "identity"] = decryptedPassword;

  return new SSH2Promise(config);
}

async function handleSsh(
  callback: (ssh: SSH2Promise) => Promise<any>,
  options: SshDetailsToIpc,
  passwordIsEncrypted = true
) {
  let ssh: SSH2Promise;
  try {
    ssh = buildConnection(options, passwordIsEncrypted);
    await ssh.connect();
    return await callback(ssh);
  } catch (err) {
    return { success: false, message: formatErrorToString(err) };
  } finally {
    if (ssh) {
      ssh.close();
    }
  }
}
