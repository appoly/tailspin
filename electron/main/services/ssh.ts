import { safeStorage } from "electron";
import { createHash } from "node:crypto";
import SSH2Promise from "ssh2-promise";
import { expandHome } from "../helpers";
import type { LogFile, SshDetailsToIpc } from "../../../shared/interfaces";
import {
  SearchContextLines,
  SearchOutputCapBytes,
  SearchTimeoutSeconds,
} from "../../../shared/search";

// Everything that talks to a remote box lives here so the IPC handlers (driven
// by the renderer) and the MCP server (driven by an agent) run the exact same
// fixed, quoted command templates. Neither caller can hand this module an
// arbitrary shell string.

// Mirrors src/constants/Ssh.ts. If these drift, the renderer's "load entire file"
// guard and the main process disagree about what is safe to pull down.
export const MaxFileSizeToLoadBytes = 1024 * 250 * 1024;
export const MaxCompressedUncompressedBytes = 512 * 1024 * 1024;

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

// Passphrases are never written to disk, but once the user has typed one into
// the app it is reasonable for the MCP server to reuse it for the rest of the
// session rather than failing with "open this connection first" every time.
const rememberedPassphrases = new Map<string, string>();

export type SshResult = { success: boolean; message?: string; fileSize?: string };

/**
 * Wrap a value so a shell treats it as one literal argument, whatever spaces,
 * quotes or globs it contains.
 */
export function shellQuote(value: string): string {
  return `'${String(value ?? "").replace(/'/g, "'\\''")}'`;
}

/**
 * Like shellQuote, but a leading "~" stays outside the quotes so the remote
 * shell still expands it. Paths such as ~/site/storage/logs are common on
 * Forge boxes and quoting the tilde would turn them into a literal directory.
 */
export function quotePath(path: string): string {
  const value = String(path ?? "");
  if (value === "~") return "~";
  if (value.startsWith("~/")) return `~/${shellQuote(value.slice(2))}`;
  return shellQuote(value);
}

/** Never interpolate a caller-supplied number into a command without flattening it first. */
export function toByteCount(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function isCompressedPath(path: string): boolean {
  return path.toLowerCase().endsWith(".gz");
}

/** "file", "directory", or "" when the path does not exist. */
export async function pathType(ssh: SSH2Promise, path: string): Promise<string> {
  const quoted = quotePath(path);
  const response = await ssh.exec(`test -d ${quoted} && echo "directory" || (test -f ${quoted} && echo "file")`);
  // Callers compare this with strict equality, so strip the shell's trailing newline
  return typeof response === "string" ? response.trim() : String(response ?? "");
}

/**
 * One line per file as "<mtime> <size> <path>", newest first. "*.log*" also
 * catches rotated and gzipped logs (.log.1, .log.2.gz). The directory is
 * quoted but the glob is not, or the shell would not expand it.
 */
export async function listDirectoryRaw(ssh: SSH2Promise, path: string): Promise<string> {
  const directory = path.length > 1 ? path.replace(/\/+$/, "") : path;
  // An empty directory leaves the glob unexpanded and stat complains about it;
  // that is not worth surfacing, and `test -d` already proved the path exists.
  return ssh.exec(`stat -c '%Y %s %n' ${quotePath(directory)}/*.log* 2>/dev/null | sort -rn`);
}

/** Parse listDirectoryRaw's output. Kept here so the MCP server and the renderer agree. */
export function parseDirectoryListing(raw: string): LogFile[] {
  const files: LogFile[] = [];
  for (const line of String(raw ?? "").split("\n")) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
    if (!match) continue;
    const path = match[3];
    const name = path.slice(path.lastIndexOf("/") + 1);
    files.push({
      name,
      path,
      size: Number(match[2]),
      modified: Number(match[1]),
      compressed: isCompressedPath(name),
    });
  }
  return files;
}

/** Size and mtime of one file, for listing a connection that points at a file rather than a directory. */
export async function statFile(ssh: SSH2Promise, path: string): Promise<{ size: number; modified: number }> {
  const response = await ssh.exec(`stat -c '%Y %s' -- ${quotePath(path)}`);
  const [modified, size] = String(response ?? "").trim().split(/\s+/).map(Number);
  return { size: size || 0, modified: modified || 0 };
}

/** The last `numberOfBytes` of a file (0 = whole file), plus its size for the next read. */
export async function readTail(ssh: SSH2Promise, path: string, numberOfBytes: number): Promise<SshResult> {
  const bytes = toByteCount(numberOfBytes);
  if (isCompressedPath(path)) {
    return readCompressed(ssh, path, bytes);
  }

  const quoted = quotePath(path);
  const response =
    bytes === 0 ? await ssh.exec(`tail -n +1 -- ${quoted}`) : await ssh.exec(`tail -c ${bytes} -- ${quoted}`);
  const fileSize = await ssh.exec(`stat -c %s -- ${quoted}`);
  return { success: true, message: response, fileSize };
}

/** Everything appended since `fileSizeAtLastRead`. Refuses compressed files, which never grow. */
export async function readSince(ssh: SSH2Promise, path: string, fileSizeAtLastRead: number): Promise<SshResult> {
  const quoted = quotePath(path);
  const offset = toByteCount(fileSizeAtLastRead);
  const response = await ssh.exec(`tail -c +${offset} -- ${quoted}`);
  const fileSize = await ssh.exec(`stat -c %s -- ${quoted}`);
  return { success: true, message: response, fileSize };
}

/**
 * `length` bytes starting at byte `offset` (0-based). `tail -c +N` is 1-based
 * and seeks rather than reads, so this costs the same on a 3 GB file as a 3 KB one.
 */
export async function readRange(ssh: SSH2Promise, path: string, offset: number, length: number): Promise<string> {
  const from = toByteCount(offset) + 1;
  const count = Math.max(1, toByteCount(length));
  return ssh.exec(`tail -c +${from} -- ${quotePath(path)} 2>/dev/null | head -c ${count}`);
}

/**
 * Bounded whole-file search. Everything the caller controls arrives as a
 * positional argument to `sh -c`, so the pattern and path are never part of
 * the command text and the shell never interprets them. Numbers are flattened
 * first. The pipeline is wrapped in `timeout` and `nice`, grep stops after
 * enough matching lines, and the output is capped, so the worst case is one
 * sequential read that gives up after SearchTimeoutSeconds.
 *
 * Plain files are read backwards with `tac`, so the newest matches come first
 * and a search that finds enough of them touches only the end of the file.
 * Compressed files have no backwards mode; they are decompressed forward
 * (same cost as opening them in the UI) and the newest output kept.
 *
 * stderr is discarded because ssh2-promise rejects on any stderr output, and
 * the exit status is printed on stdout instead so a timeout stays visible.
 */
export async function searchRemote(
  ssh: SSH2Promise,
  path: string,
  pattern: string,
  limit: number,
  compressed: boolean
): Promise<{ raw: string; timedOut: boolean; reversed: boolean; capped: boolean }> {
  const context = SearchContextLines;
  const cap = SearchOutputCapBytes;
  // A match can sit on several lines of one entry, so allow more matching lines than entries wanted.
  const maxLines = Math.max(1, Math.floor(limit)) * 3;
  const grep = `LC_ALL=C grep -F -i -A ${context} -B ${context} -e "$2"`;
  const script = compressed
    ? `LC_ALL=C nice -n 19 gzip -dc -- "$1" | ${grep} | tail -c ${cap}`
    : `LC_ALL=C nice -n 19 tac -- "$1" | ${grep} -m ${maxLines} | head -c ${cap}`;
  const command =
    `timeout ${SearchTimeoutSeconds} sh -c ${shellQuote(script)} sh ${quotePath(path)} ${shellQuote(pattern)} 2>/dev/null; ` +
    `echo "__TAILSPIN_STATUS:$?"`;
  const output = String(await ssh.exec(command));
  const at = output.lastIndexOf("__TAILSPIN_STATUS:");
  const status = at === -1 ? null : Number(output.slice(at + "__TAILSPIN_STATUS:".length).trim());
  const raw = at === -1 ? output : output.slice(0, at).replace(/\n$/, "");
  return {
    raw,
    timedOut: status === 124,
    reversed: !compressed,
    capped: Buffer.byteLength(raw, "utf8") >= cap - 1024,
  };
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

async function readCompressed(ssh: SSH2Promise, path: string, numberOfBytes: number): Promise<SshResult> {
  const quoted = quotePath(path);
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatErrorToString(err: any) {
  return typeof err === "string" ? err : err.message ?? "Error has occurred";
}

function decryptString(string: string) {
  const buffer = Buffer.from(string, "base64");
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
    .update(`${secret} ${options.passphrase ?? ""}`)
    .digest("hex");
  return [options.host, options.port, options.username, options.passwordType, fingerprint].join("|");
}

function passphraseKey({ host, port, username, password }: SshDetailsToIpc): string {
  return [host, port, username, password].join("|");
}

/** A passphrase the user typed into the app earlier this session, if any. */
export function recallPassphrase(options: SshDetailsToIpc): string | undefined {
  return rememberedPassphrases.get(passphraseKey(options));
}

function buildConnection(
  { host, port, username, passwordType, passphrase }: SshDetailsToIpc,
  secret: string,
  uniqueId: string
) {
  const config: Record<string, unknown> = {
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

export function closeAllConnections() {
  for (const pooled of [...pool.values()]) {
    pooled.evicted = true;
    clearIdleTimer(pooled);
    pool.delete(pooled.key);
    closeNow(pooled);
  }
}

/**
 * Run `callback` against a pooled connection for `options`. Any failure becomes
 * `{ success: false, message }` rather than a thrown error.
 */
export async function withSsh<T extends SshResult>(
  callback: (ssh: SSH2Promise) => Promise<T>,
  options: SshDetailsToIpc,
  passwordIsEncrypted = true
): Promise<T | SshResult> {
  let pooled: PooledConnection | undefined;
  try {
    pooled = acquire(options, passwordIsEncrypted);
    await pooled.connecting;
    if (options.passphrase) {
      rememberedPassphrases.set(passphraseKey(options), options.passphrase);
    }
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
