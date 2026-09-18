import { randomBytes } from "node:crypto";
import { basename } from "node:path";
import { statSync } from "node:fs";
import { expandHome } from "../helpers";
import { store } from "../ipc-handlers/store";
import { isLogFileName, listLogFiles, readLocalLogTail } from "../services/local-logs";
import {
  listDirectoryRaw,
  parseDirectoryListing,
  pathType,
  readTail,
  recallPassphrase,
  statFile,
  withSsh,
} from "../services/ssh";
import { parseLogEntries } from "../../../shared/logParser";
import { writtenClockMillis } from "../../../shared/logSeek";
import { localWindow, remoteWindow, runLocalSearch, runRemoteSearch } from "../services/log-search";
import { searchSizeLimitMessage, type SearchOutcome } from "../../../shared/search";
import type { Connection, LogEntry, LogFile, SshDetailsToIpc } from "../../../shared/interfaces";
import {
  McpDefaultLimit,
  McpMaxLimit,
  McpMaxReadBytes,
  type McpConnectionSummary,
  type McpLogEntrySummary,
  type McpLogFileSummary,
  type McpReadLogResult,
  type McpSearchLogResult,
  type McpToolName,
} from "../../../shared/mcp";

// The tool implementations behind the MCP server. Everything an agent can do
// to a log server is one of these four functions, and each of them is
// read-only, bounded in bytes, and confined to the connection's configured
// path. Per-connection exposure is opt-in (`connection.mcpEnabled`).

const MessagePreviewChars = 300;
// Parsed reads are kept so get_log_entry can serve a stack trace without a
// second round trip, but they are bounded by size and age rather than count:
// twenty 2 MB reads would otherwise pin tens of megabytes for the app's lifetime.
const ReadCacheMaxBytes = 8 * 1024 * 1024;
const ReadCacheTtlMs = 10 * 60_000;

type CachedRead = { entries: LogEntry[]; connection: string; file: string; at: number; bytes: number };
const readCache = new Map<string, CachedRead>();

// One remote read at a time per connection. An agent retrying in a tight loop
// should queue behind itself, not open a second session to a production box.
const locks = new Map<string, Promise<unknown>>();

export class McpToolError extends Error {}

export async function runTool(tool: McpToolName, args: Record<string, unknown>): Promise<unknown> {
  switch (tool) {
    case "list_connections":
      return listConnections();
    case "list_log_files":
      return listLogFilesTool(args);
    case "read_log":
      return readLog(args);
    case "get_log_entry":
      return getLogEntry(args);
    case "search_log":
      return searchLog(args);
    default:
      throw new McpToolError(`Unknown tool: ${String(tool)}`);
  }
}

// ---------------------------------------------------------------------------
// Connections

function exposedConnections(): Connection[] {
  const all = (store().get("connections", []) as Connection[]) ?? [];
  return all.filter((c) => c && c.mcpEnabled === true);
}

function summarise(connection: Connection): McpConnectionSummary {
  return {
    id: connection.uid,
    name: connection.name,
    type: connection.type,
    ...(connection.type === "remote" && connection.ssh
      ? { target: `${connection.ssh.username}@${connection.ssh.host}` }
      : {}),
    path: connection.path,
    searchable: isSearchable(connection),
  };
}

function isSearchable(connection: Connection): boolean {
  return connection.type === "local" || connection.searchEnabled === true;
}

function listConnections() {
  const connections = exposedConnections().map(summarise);
  return {
    connections,
    ...(connections.length === 0
      ? { note: "No connections are exposed to MCP. In Tailspin, edit a connection and tick 'Expose to MCP'." }
      : {}),
  };
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new McpToolError(`'${key}' is required.`);
  }
  return value.trim();
}

/** Accept the uid or, for convenience, the display name. Only exposed connections resolve. */
function resolveConnection(reference: string): Connection {
  const exposed = exposedConnections();
  const match =
    exposed.find((c) => c.uid === reference) ??
    exposed.find((c) => c.name.toLowerCase() === reference.toLowerCase());
  if (match) return match;

  const all = (store().get("connections", []) as Connection[]) ?? [];
  const hidden = all.find((c) => c.uid === reference || c.name.toLowerCase() === reference.toLowerCase());
  if (hidden) {
    throw new McpToolError(
      `Connection '${hidden.name}' exists but is not exposed to MCP. Tick 'Expose to MCP' on it in Tailspin.`
    );
  }
  throw new McpToolError(`No connection matches '${reference}'. Call list_connections to see what is available.`);
}

function sshDetails(connection: Connection): { options: SshDetailsToIpc; encrypted: boolean } {
  if (!connection.ssh) throw new McpToolError(`Connection '${connection.name}' has no SSH details.`);
  const options: SshDetailsToIpc = { ...connection.ssh };
  if (connection.ssh.passphraseRequired) {
    const passphrase = recallPassphrase(options);
    if (!passphrase) {
      throw new McpToolError(
        `Connection '${connection.name}' uses a passphrase-protected key. ` +
          `Open it once in Tailspin this session to unlock it, then retry.`
      );
    }
    options.passphrase = passphrase;
  }
  return { options, encrypted: connection.ssh.passwordType === "password" };
}

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(fn);
  locks.set(key, run);
  try {
    return await run;
  } finally {
    if (locks.get(key) === run) locks.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Files

type Target = { isDirectory: boolean; files: LogFile[] };

/** What the connection's path points at, and the log files under it. */
async function describeTarget(connection: Connection): Promise<Target> {
  if (connection.type === "local") {
    const path = expandHome(connection.path);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      return { isDirectory: true, files: listLogFiles(path) };
    }
    return {
      isDirectory: false,
      files: [
        {
          name: basename(path),
          path,
          size: stats.size,
          modified: Math.floor(stats.mtimeMs / 1000),
          compressed: path.toLowerCase().endsWith(".gz"),
        },
      ],
    };
  }

  const { options, encrypted } = sshDetails(connection);
  const result = await withSsh(
    async (ssh) => {
      const type = await pathType(ssh, connection.path);
      if (type === "directory") {
        return { success: true, target: { isDirectory: true, files: parseDirectoryListing(await listDirectoryRaw(ssh, connection.path)) } };
      }
      if (type === "file") {
        const { size, modified } = await statFile(ssh, connection.path);
        const name = connection.path.slice(connection.path.lastIndexOf("/") + 1);
        return {
          success: true,
          target: {
            isDirectory: false,
            files: [{ name, path: connection.path, size, modified, compressed: name.toLowerCase().endsWith(".gz") }],
          },
        };
      }
      return { success: false, message: `'${connection.path}' does not exist on ${options.host}.` };
    },
    options,
    encrypted
  );
  if (!result.success || !("target" in result)) {
    throw new McpToolError(result.message ?? "Could not reach the server.");
  }
  return result.target as Target;
}

function summariseFile(file: LogFile): McpLogFileSummary {
  return {
    name: file.name,
    size: file.size,
    modified: new Date(file.modified * 1000).toISOString(),
    compressed: file.compressed,
  };
}

async function listLogFilesTool(args: Record<string, unknown>) {
  const connection = resolveConnection(requireString(args, "connection"));
  const target = await withLock(connection.uid, () => describeTarget(connection));
  return {
    connection: connection.name,
    path: connection.path,
    files: target.files.map(summariseFile),
  };
}

/**
 * Pick the file to read. Names are validated against the listing rather than
 * joined blindly, so a caller can only ever name something Tailspin would show.
 */
function chooseFile(connection: Connection, target: Target, requested: string | undefined): LogFile {
  if (!target.isDirectory) {
    const only = target.files[0];
    if (requested && requested !== only.name && requested !== only.path) {
      throw new McpToolError(`Connection '${connection.name}' points at a single file (${only.name}); 'file' must be omitted or match it.`);
    }
    return only;
  }

  if (!requested) {
    if (target.files.length === 0) throw new McpToolError(`No log files under ${connection.path}.`);
    return target.files[0]; // Newest first, so this is the live log in practice
  }

  if (/[\\/]/.test(requested) || requested.startsWith(".") || !isLogFileName(requested)) {
    throw new McpToolError(`'${requested}' is not a log file name. Pass a bare file name from list_log_files.`);
  }
  const file = target.files.find((f) => f.name === requested);
  if (!file) {
    throw new McpToolError(`'${requested}' is not in ${connection.path}. Call list_log_files for the current names.`);
  }
  return file;
}

// ---------------------------------------------------------------------------
// Reading

function clampBytes(value: unknown): number {
  const fallback = Number(store().get("ssh.numberOfBytes", 500 * 1024)) || 500 * 1024;
  const requested = Math.floor(Number(value));
  const bytes = Number.isFinite(requested) && requested > 0 ? requested : fallback;
  return Math.min(bytes, McpMaxReadBytes);
}

function clampLimit(value: unknown): number {
  const requested = Math.floor(Number(value));
  if (!Number.isFinite(requested) || requested <= 0) return McpDefaultLimit;
  return Math.min(requested, McpMaxLimit);
}

function severityFilter(value: unknown): Set<string> | null {
  if (value === undefined || value === null || value === "") return null;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const set = new Set(raw.map((s) => String(s).trim().toLowerCase()).filter(Boolean));
  return set.size ? set : null;
}

/** ISO 8601, or a relative window like "15m", "2h", "1d" meaning "that long ago". */
function parseTimeBound(value: unknown, key: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).trim();
  const relative = text.match(/^(\d+)\s*([smhd])$/i);
  if (relative) {
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[relative[2].toLowerCase() as "s" | "m" | "h" | "d"];
    return Date.now() - Number(relative[1]) * unit;
  }
  // A bare time is compared to timestamps as written in the log; one with an
  // offset or Z is absolute. Either way both sides end up on the same axis.
  const bare = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(text);
  const parsed = Date.parse(bare ? `${text.replace(" ", "T")}Z` : text.replace(" ", "T"));
  if (Number.isNaN(parsed)) {
    throw new McpToolError(`'${key}' must be an ISO 8601 datetime or a relative window like "30m", "2h", "1d".`);
  }
  return parsed;
}

/** With an offset the timestamp is absolute; without one it is taken as written, like `since`/`until`. */
function entryTime(entry: LogEntry): number {
  if (/[+-]\d\d:\d\d$/.test(entry.timestamp)) return Date.parse(entry.timestamp.replace(" ", "T"));
  return writtenClockMillis(entry.timestamp) ?? NaN;
}

// Obvious secrets get masked before they reach an agent's transcript. This is a
// backstop, not a guarantee, and can be turned off in Settings.
const SecretPatterns: RegExp[] = [
  /\b(bearer)\s+[a-z0-9\-._~+/]{16,}=*/gi,
  /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|passw(?:or)?d|authorization|client[_-]?secret)\b(["']?\s*[:=]\s*["']?)((?!bearer\b)[^\s"',;&]{6,})/gi,
  /\b(sk|pk|rk)_(live|test)_[a-z0-9]{10,}\b/gi,
];

function redact(text: string): string {
  if (store().get("app.mcpRedact", true) === false) return text;
  let out = text.replace(SecretPatterns[0], "$1 [REDACTED]");
  out = out.replace(SecretPatterns[1], "$1$2[REDACTED]");
  out = out.replace(SecretPatterns[2], "[REDACTED]");
  return out;
}

function summariseEntry(entry: LogEntry, id: number): McpLogEntrySummary {
  const lines = entry.text.split("\n");
  const firstLine = lines[0] ?? "";
  const message = firstLine.length > MessagePreviewChars ? firstLine.slice(0, MessagePreviewChars) + "…" : firstLine;
  return {
    id,
    timestamp: entry.timestamp,
    environment: entry.environment,
    severity: entry.severity,
    message: redact(message),
    line_count: lines.length,
    truncated: lines.length > 1 || firstLine.length > MessagePreviewChars,
  };
}

async function readRaw(connection: Connection, file: LogFile, bytes: number): Promise<{ content: string; fileSize: number }> {
  if (connection.type === "local") {
    const result = await readLocalLogTail(file.path, bytes);
    if (!result.success) throw new McpToolError(result.message ?? "Could not read the file.");
    return { content: result.content, fileSize: result.fileSize };
  }

  const { options, encrypted } = sshDetails(connection);
  const result = await withSsh((ssh) => readTail(ssh, file.path, bytes), options, encrypted);
  if (!result.success) throw new McpToolError(result.message ?? "Could not read the file.");
  return { content: String(result.message ?? ""), fileSize: Number(result.fileSize) || 0 };
}

/** Drop expired reads, then the oldest until the rest fit the byte budget. */
function pruneReadCache(now = Date.now()) {
  for (const [id, cached] of readCache) {
    if (now - cached.at > ReadCacheTtlMs) readCache.delete(id);
  }
  let total = 0;
  for (const cached of readCache.values()) total += cached.bytes;
  // Map iterates in insertion order, so the first key is always the oldest.
  while (total > ReadCacheMaxBytes && readCache.size > 0) {
    const oldest = readCache.keys().next().value!;
    total -= readCache.get(oldest)!.bytes;
    readCache.delete(oldest);
  }
}

function rememberRead(entries: LogEntry[], connection: string, file: string, bytes: number): string {
  const id = randomBytes(6).toString("base64url");
  readCache.set(id, { entries, connection, file, at: Date.now(), bytes });
  pruneReadCache();
  return id;
}

async function readLog(args: Record<string, unknown>): Promise<McpReadLogResult> {
  const connection = resolveConnection(requireString(args, "connection"));
  const requestedFile = typeof args.file === "string" && args.file.trim() ? args.file.trim() : undefined;
  const bytes = clampBytes(args.bytes);
  const limit = clampLimit(args.limit);
  const severities = severityFilter(args.severity);
  const search = typeof args.search === "string" && args.search.trim() ? args.search.trim().toLowerCase() : null;
  const since = parseTimeBound(args.since, "since");
  const until = parseTimeBound(args.until, "until");

  return withLock(connection.uid, async () => {
    const target = await describeTarget(connection);
    const file = chooseFile(connection, target, requestedFile);
    let { content, fileSize } = await readRaw(connection, file, bytes);
    let mode: "tail" | "window" = "tail";

    let parsed = parseLogEntries(content);

    // The tail did not reach back to `since`: seek to it instead of returning
    // nothing. Costs a handful of 4 KB probes, never a scan.
    const oldestMs = parsed.length ? entryTime(parsed[parsed.length - 1]) : NaN;
    if (since !== null && !file.compressed && fileSize > content.length && (Number.isNaN(oldestMs) || oldestMs > since)) {
      const window =
        connection.type === "local"
          ? await localWindow(file.path, { targetMs: since }, bytes)
          : await (async () => {
              const { options, encrypted } = sshDetails(connection);
              return remoteWindow(options, encrypted, file.path, { targetMs: since }, bytes);
            })();
      if (window.success) {
        content = window.content;
        fileSize = window.fileSize;
        parsed = parseLogEntries(content);
        mode = "window";
      }
    }

    const matched = parsed.filter((entry) => {
      if (severities && !severities.has(entry.severity.toLowerCase())) return false;
      if (search && !entry.text.toLowerCase().includes(search) && !entry.timestamp.includes(search)) return false;
      if (since !== null || until !== null) {
        const time = entryTime(entry);
        if (Number.isNaN(time)) return false;
        if (since !== null && time < since) return false;
        if (until !== null && time > until) return false;
      }
      return true;
    });

    // Ids index the full parsed array so get_log_entry can find filtered-out neighbours too.
    const ids = new Map<LogEntry, number>(parsed.map((entry, index) => [entry, index]));
    const readId = rememberRead(parsed, connection.name, file.name, content.length);
    const page = matched.slice(0, limit);

    const notes: string[] = [];
    if (matched.length > page.length) notes.push(`${matched.length - page.length} more matching entries; raise 'limit' or narrow the filters.`);
    if (mode === "window") notes.push(`Seeked to 'since' and read ${content.length} bytes from there; the tail of the file was not read.`);
    else if (fileSize > content.length) notes.push(`Only the last ${content.length} of ${fileSize} bytes were read; pass 'since' to seek further back, or use search_log.`);
    if (parsed.length === 0 && content.length > 0) notes.push("No Laravel-formatted entries found in the bytes read.");

    return {
      read_id: readId,
      connection: connection.name,
      file: file.name,
      bytes_read: content.length,
      file_size: fileSize,
      entries_parsed: parsed.length,
      entries_matched: matched.length,
      entries: page.map((entry) => summariseEntry(entry, ids.get(entry)!)),
      mode,
      ...(notes.length ? { note: notes.join(" ") } : {}),
    };
  });
}

async function searchLog(args: Record<string, unknown>): Promise<McpSearchLogResult> {
  const connection = resolveConnection(requireString(args, "connection"));
  const pattern = requireString(args, "pattern");
  const requestedFile = typeof args.file === "string" && args.file.trim() ? args.file.trim() : undefined;
  const limit = args.limit;

  if (!isSearchable(connection)) {
    throw new McpToolError(
      `Whole-file search is not enabled for '${connection.name}'. Turn on 'Allow whole-file search' on it in Tailspin, or use read_log.`
    );
  }

  return withLock(connection.uid, async () => {
    const target = await describeTarget(connection);
    const file = chooseFile(connection, target, requestedFile);
    const tooBig = searchSizeLimitMessage(file.size, file.compressed);
    if (tooBig) throw new McpToolError(tooBig);

    let outcome: SearchOutcome;
    if (connection.type === "local") {
      outcome = await runLocalSearch(file.path, pattern, limit);
    } else {
      const { options, encrypted } = sshDetails(connection);
      outcome = await runRemoteSearch(options, encrypted, file.path, pattern, limit);
    }
    if (!outcome.success) throw new McpToolError(outcome.message ?? "Search failed.");

    const readId = rememberRead(outcome.entries, connection.name, file.name, outcome.entries.reduce((n, e) => n + e.text.length, 0));
    const notes: string[] = [];
    if (outcome.timedOut) notes.push("The search hit its time limit; older parts of the file were not scanned.");
    else if (outcome.scanned === "partial") notes.push("Stopped after enough matches; older matches may exist. Narrow the pattern or pass a rotated file.");
    if (outcome.entries.length === 0 && outcome.scanned === "whole") notes.push("No matches anywhere in the file.");

    return {
      read_id: readId,
      connection: connection.name,
      file: file.name,
      pattern,
      scanned: outcome.scanned,
      duration_ms: outcome.durationMs,
      timed_out: outcome.timedOut,
      entries_matched: outcome.entries.length,
      entries: outcome.entries.map((entry, index) => summariseEntry(entry, index)),
      ...(notes.length ? { note: notes.join(" ") } : {}),
    };
  });
}

function getLogEntry(args: Record<string, unknown>) {
  const readId = requireString(args, "read_id");
  pruneReadCache();
  const cached = readCache.get(readId);
  if (!cached) {
    throw new McpToolError(`read_id '${readId}' is unknown or has expired. Call read_log again.`);
  }
  const entryId = Math.floor(Number(args.entry_id));
  const entry = Number.isFinite(entryId) ? cached.entries[entryId] : undefined;
  if (!entry) {
    throw new McpToolError(`entry_id ${String(args.entry_id)} is not in read '${readId}' (0–${cached.entries.length - 1}).`);
  }
  return {
    connection: cached.connection,
    file: cached.file,
    entry: {
      id: entryId,
      timestamp: entry.timestamp,
      environment: entry.environment,
      severity: entry.severity,
      text: redact(entry.text),
    },
  };
}
