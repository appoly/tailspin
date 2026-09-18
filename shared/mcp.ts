// Wire format between the MCP shim (a plain Node process spawned by the MCP
// client) and the running Tailspin app. Newline-delimited JSON over a local
// socket; one request per connection.

export const McpToolNames = ["list_connections", "list_log_files", "read_log", "get_log_entry", "search_log"] as const;
export type McpToolName = (typeof McpToolNames)[number];

export interface McpSocketRequest {
  id: string;
  tool: McpToolName;
  args: Record<string, unknown>;
}

export type McpSocketResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: string };

/** The MCP server never hands out more than this per read, whatever the caller asks for. */
export const McpMaxReadBytes = 2 * 1024 * 1024;
export const McpDefaultLimit = 20;
export const McpMaxLimit = 200;

export interface McpConnectionSummary {
  id: string;
  name: string;
  type: "local" | "remote";
  /** Remote only: user@host, so the model can tell servers apart. Never credentials. */
  target?: string;
  path: string;
  /** Whether search_log may be used on it. Local connections always can. */
  searchable: boolean;
}

export interface McpLogFileSummary {
  name: string;
  size: number;
  modified: string;
  compressed: boolean;
}

export interface McpLogEntrySummary {
  id: number;
  timestamp: string;
  environment: string;
  severity: string;
  /** First line of the entry, capped. The full text is one get_log_entry away. */
  message: string;
  line_count: number;
  truncated: boolean;
}

export interface McpReadLogResult {
  read_id: string;
  connection: string;
  file: string;
  bytes_read: number;
  file_size: number;
  entries_parsed: number;
  entries_matched: number;
  entries: McpLogEntrySummary[];
  /** "tail" is the newest bytes; "window" means the read was seeked to `since`. */
  mode: "tail" | "window";
  note?: string;
}

export interface McpSearchLogResult {
  read_id: string;
  connection: string;
  file: string;
  pattern: string;
  /** "whole" means the entire file was scanned; "partial" means it stopped after enough matches. */
  scanned: "whole" | "partial";
  duration_ms: number;
  timed_out: boolean;
  entries_matched: number;
  entries: McpLogEntrySummary[];
  note?: string;
}

/** What Settings shows about the MCP server, straight from the main process. */
export interface McpStatus {
  enabled: boolean;
  running: boolean;
  socketPath: string;
  /** Ready to paste into a terminal: registers the server with Claude Code. */
  claudeCodeCommand: string;
  /** For clients configured by JSON (Claude Desktop, Cursor, and so on). */
  jsonConfig: string;
  error: string | null;
}
