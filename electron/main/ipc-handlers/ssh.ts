import { ipcMain, safeStorage, app } from "electron";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import SSH2Promise from "ssh2-promise";
import type { SshDetailsToIpc } from "../../../shared/interfaces";

// Mirrors src/constants/Ssh.ts. If these drift, the renderer's "load entire file"
// guard and the main process disagree about what is safe to pull down.
const MaxFileSizeToLoadBytes = 1024 * 250 * 1024;
const MaxCompressedUncompressedBytes = 512 * 1024 * 1024;

// How long a pooled connection may sit unused before we hand the socket back.
const IdleTimeoutMs = 60_000;

type PooledConnection = {
  key: string;
  ssh: SSH2Promise;
  connecting: Promise<unknown>;
  /** Calls currently using the socket. We only close on zero. */
  inFlight: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
  /** Removed from the pool: no new call may be handed this entry. */
  evicted: boolean;
  closed: boolean;
};

const pool = new Map<string, PooledConnection>();

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
        const quoted = shellQuote(path);
        let response = await ssh.exec(`test -d ${quoted} && echo "directory" || (test -f ${quoted} && echo "file")`);
        // The renderer compares this with strict equality, so strip the shell's trailing newline
        return { success: true, message: typeof response === "string" ? response.trim() : response };
      },
      options,
      passwordIsEncrypted
    )
  );
  ipcMain.handle("ssh-get-files-in-directory", async (event, options, path: string, passwordIsEncrypted: boolean) =>
    handleSsh(
      async (ssh) => {
        // One line per file as "<mtime> <size> <path>", newest first. The renderer
        // parses all three columns, so unlike before nothing is stripped here.
        // "*.log*" also catches rotated and gzipped logs (.log.1, .log.2.gz).
        // The directory is quoted but the glob is not, or the shell would not expand it.
        const directory = path.length > 1 ? path.replace(/\/+$/, "") : path;
        // An empty directory leaves the glob unexpanded and stat complains about it;
        // that is not worth surfacing, and `test -d` already proved the path exists.
        let response = await ssh.exec(`stat -c '%Y %s %n' ${shellQuote(directory)}/*.log* 2>/dev/null | sort -rn`);
        return { success: true, message: response };
      },
      options,
      passwordIsEncrypted
    )
  );
  ipcMain.handle(
    "ssh-read-from-path",
    async (event, options, path: string, passwordIsEncrypted: boolean, numberOfBytes = 10000) =>
      handleSsh(
        async (ssh) => {
          const bytes = toByteCount(numberOfBytes);
          if (isCompressedPath(path)) {
            return readCompressed(ssh, path, bytes);
          }

          const quoted = shellQuote(path);
          let response = "";
          // If number of bytes is 0, it means read the entire file with tail:
          if (bytes === 0) {
            response = await ssh.exec(`tail -n +1 -- ${quoted}`);
          } else {
            response = await ssh.exec(`tail -c ${bytes} -- ${quoted}`);
          }
          // Also get the file size in bytes to help with loading the next x bytes etc:
          const fileSize = await ssh.exec(`stat -c %s -- ${quoted}`);
          return { success: true, message: response, fileSize };
        },
        options,
        passwordIsEncrypted
      )
  );
  ipcMain.handle(
    "ssh-read-next-from-path",
    async (event, options, path: string, passwordIsEncrypted: boolean, fileSizeAtLastReadInBytes: number) => {
      // A gzip stream has no meaningful byte offset to resume from, and a rotated
      // file will not grow anyway. Refuse before spending a connection on it.
      if (isCompressedPath(path)) {
        return { success: false, message: "Auto-fetch is not available for compressed files." };
      }
      return handleSsh(
        async (ssh) => {
          const quoted = shellQuote(path);
          const offset = toByteCount(fileSizeAtLastReadInBytes);
          const response = await ssh.exec(`tail -c +${offset} -- ${quoted}`); // Read from the last read position
          const fileSize = await ssh.exec(`stat -c %s -- ${quoted}`);
          return { success: true, message: response, fileSize };
        },
        options,
        passwordIsEncrypted
      );
    }
  );
  ipcMain.handle(
    "ssh-download-from-path",
    async (event, options, path: string, passwordIsEncrypted: boolean, fileName: string) =>
      handleSsh(
        async (ssh) => {
          // sftp talks the protocol directly, so the path never reaches a shell.
          let sftp = ssh.sftp();
          await sftp.fastGet(path, app.getPath("downloads") + "/" + fileName);
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

/**
 * Wrap a value so a shell treats it as one literal argument, whatever spaces,
 * quotes or globs it contains.
 */
function shellQuote(value: string): string {
  return `'${String(value ?? "").replace(/'/g, "'\\''")}'`;
}

/** Never interpolate a renderer-supplied number into a command without flattening it first. */
function toByteCount(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function isCompressedPath(path: string): boolean {
  return path.toLowerCase().endsWith(".gz");
}

/**
 * `gzip -l` reads the four byte trailer rather than decompressing, so asking for
 * the uncompressed size costs the server a seek. Its last line is
 * "<compressed> <uncompressed> <ratio> <name>".
 */
function parseGzipListing(output: string): number | null {
  const line = String(output ?? "").trim().split("\n").pop() ?? "";
  const columns = line.trim().split(/\s+/);
  const size = Number(columns[1]);
  return columns.length >= 3 && Number.isFinite(size) ? size : null;
}

async function readCompressed(ssh: SSH2Promise, path: string, numberOfBytes: number) {
  const quoted = shellQuote(path);
  const uncompressedSize = parseGzipListing(await ssh.exec(`gzip -l -- ${quoted} 2>/dev/null | tail -n 1`));

  if (uncompressedSize === null) {
    return {
      success: false,
      message: "Could not read the size of this compressed file. Download it and open it locally instead.",
    };
  }

  if (uncompressedSize > MaxCompressedUncompressedBytes) {
    return {
      success: false,
      message:
        `This file expands to ${formatBytes(uncompressedSize)}, over the ` +
        `${formatBytes(MaxCompressedUncompressedBytes)} limit. Download it and open it locally instead.`,
    };
  }

  // "Load entire file" on a compressed file has to be judged on what it expands
  // to, not on the handful of megabytes sitting on disk.
  if (numberOfBytes === 0 && uncompressedSize > MaxFileSizeToLoadBytes) {
    return {
      success: false,
      message:
        `This file expands to ${formatBytes(uncompressedSize)}, too large to load whole. ` +
        `Pick a byte limit in Options, or download the file.`,
    };
  }

  const message =
    numberOfBytes === 0
      ? await ssh.exec(`gzip -dc -- ${quoted}`)
      : await ssh.exec(`gzip -dc -- ${quoted} | tail -c ${numberOfBytes}`);

  // Report the uncompressed size: it is what the renderer's guards are about.
  return { success: true, message, fileSize: String(uncompressedSize) };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatErrorToString(err: any) {
  return typeof err === "string" ? err : err.message ?? "Error has occurred";
}

function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

function decryptString(string: string) {
  let buffer = Buffer.from(string, "base64");
  return safeStorage.decryptString(buffer);
}

function resolveSecret({ password }: SshDetailsToIpc, decryptNeeded: boolean): string {
  if (!decryptNeeded) {
    // The unencrypted "secret" is a private key path, and ssh2 reads it as-is,
    // so a shell-style "~/.ssh/id_ed25519" has to be expanded here.
    return expandHome(password);
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Cannot decrypt password, safe storage is not available.");
  }
  return decryptString(password);
}

/**
 * Identify a connection by everything that would make it a different session.
 * The secret itself is never part of the key, only a digest of it.
 */
function connectionKey(options: SshDetailsToIpc, secret: string): string {
  const fingerprint = createHash("sha256")
    .update(`${secret} ${options.passphrase ?? ""}`)
    .digest("hex");
  return [options.host, options.port, options.username, options.passwordType, fingerprint].join("|");
}

function buildConnection(
  { host, port, username, passwordType, passphrase = null }: SshDetailsToIpc,
  secret: string,
  uniqueId: string
) {
  const config = {
    host,
    port,
    username,
    readyTimeout: 4000,
    reconnect: false,
    // ssh2-promise keeps its own process-wide cache keyed by uniqueId, which
    // defaults to user@host:port. Feeding it our fingerprint stops two
    // connections with different credentials from sharing one socket.
    uniqueId,
    ...(passphrase && { passphrase }), // Only add passphrase if it exists
  };

  config[passwordType === "password" ? "password" : "identity"] = secret;

  return new SSH2Promise(config);
}

/**
 * Take a pooled connection, opening one if there is none. The caller owns a
 * reference until it calls release().
 */
function acquire(options: SshDetailsToIpc, decryptNeeded: boolean): PooledConnection {
  const secret = resolveSecret(options, decryptNeeded);
  const key = connectionKey(options, secret);

  const existing = pool.get(key);
  if (existing) {
    clearIdleTimer(existing);
    existing.inFlight++;
    return existing;
  }

  const ssh = buildConnection(options, secret, key);
  const pooled: PooledConnection = {
    key,
    ssh,
    connecting: Promise.resolve(),
    inFlight: 1,
    idleTimer: null,
    evicted: false,
    closed: false,
  };
  pool.set(key, pooled);

  // ssh2 tells us when the socket goes away, whether we asked for it or not.
  // A dead entry must never be handed to the next call.
  ssh.on("ssh", (status: string) => {
    if (status === "disconnect") {
      evict(pooled);
    }
  });

  pooled.connecting = ssh.connect();
  // The first caller awaits this, but if it is evicted before anyone does we
  // still owe node a handler.
  pooled.connecting.catch(() => {});

  return pooled;
}

function release(pooled: PooledConnection) {
  pooled.inFlight = Math.max(0, pooled.inFlight - 1);
  if (pooled.inFlight > 0) {
    return;
  }
  if (pooled.evicted) {
    closeNow(pooled);
    return;
  }
  pooled.idleTimer = setTimeout(() => evict(pooled), IdleTimeoutMs);
  pooled.idleTimer.unref?.();
}

/** Drop an entry from the pool, closing it as soon as nothing is still using it. */
function evict(pooled: PooledConnection) {
  if (pooled.evicted) {
    return;
  }
  pooled.evicted = true;
  clearIdleTimer(pooled);
  if (pool.get(pooled.key) === pooled) {
    pool.delete(pooled.key);
  }
  if (pooled.inFlight === 0) {
    closeNow(pooled);
  }
}

function closeNow(pooled: PooledConnection) {
  if (pooled.closed) {
    return;
  }
  pooled.closed = true;
  clearIdleTimer(pooled);
  // close() rejects when the socket has already gone; there is nothing left to do about it.
  Promise.resolve(pooled.ssh.close()).catch(() => {});
}

function clearIdleTimer(pooled: PooledConnection) {
  if (pooled.idleTimer) {
    clearTimeout(pooled.idleTimer);
    pooled.idleTimer = null;
  }
}

function closeAllConnections() {
  for (const pooled of [...pool.values()]) {
    pooled.evicted = true;
    clearIdleTimer(pooled);
    pool.delete(pooled.key);
    closeNow(pooled);
  }
}

async function handleSsh(
  callback: (ssh: SSH2Promise) => Promise<any>,
  options: SshDetailsToIpc,
  passwordIsEncrypted = true
) {
  let pooled: PooledConnection | undefined;
  try {
    pooled = acquire(options, passwordIsEncrypted);
    await pooled.connecting;
    return await callback(pooled.ssh);
  } catch (err) {
    // Any failure makes the socket suspect, so it leaves the pool rather than
    // being handed half-dead to the next call.
    if (pooled) {
      evict(pooled);
    }
    return { success: false, message: formatErrorToString(err) };
  } finally {
    if (pooled) {
      release(pooled);
    }
  }
}
