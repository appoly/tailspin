export interface LogEntry {
  timestamp: string
  severity: string
  environment: string
  text: string
}

export interface SshDetails {
  host: string
  port: number
  username: string
  passwordType: 'password' | 'key'
  password: string
  passphraseRequired?: boolean
}

export interface SshRequest extends SshDetails {
  passphrase?: string
  passwordIsEncrypted?: boolean
}

export interface SshResponse {
  success: boolean
  message?: string
  fileSize?: string
}

// Kept in sync by hand with shared/interfaces.d.ts — the renderer cannot import
// from shared/ through the preload bridge, so the two copies are deliberate.
export interface LogFile {
  /** Basename, eg "laravel-2026-08-24.log.gz" */
  name: string
  /** Absolute path on whichever machine holds the file */
  path: string
  /** Bytes on disk. For a .gz this is the compressed size */
  size: number
  /** Modification time, unix seconds */
  modified: number
  compressed: boolean
}

export interface LocalLogRead {
  success: boolean
  message?: string
  content: string
  /** Uncompressed size in bytes, so the renderer's size guards mean something */
  fileSize: number
  compressed: boolean
}

export interface LocalLogTailRead {
  success: boolean
  message?: string
  /** Only the bytes appended since the requested offset */
  content: string
  /** Size of the file at the moment it was read, so the next read knows where to start */
  fileSize: number
}

export interface BaseConnection {
  name: string
  icon: string
  path: string
  type: 'local' | 'remote'
  ssh?: SshDetails
  isFavorite?: boolean
  iconColor?: string
  /** Opt-in: visible to the MCP server, so an agent may read this connection's logs. */
  mcpEnabled?: boolean
  /** Opt-in for remote connections: whole-file search may run on the server. Local connections always may. */
  searchEnabled?: boolean
}

export interface Connection extends BaseConnection {
  uid: string
}

export interface ForgeServer {
  id: number
  name: string
  ipAddress: string
}

export interface ForgeSite {
  id: number
  name: string
  username: string
  serverId: number
}

export interface Download {
  type: 'inProgress' | 'completed' | 'failed'
  name: string
  date: Date
}

export interface SshOptions {
  numberOfBytes: number
}

/** Where the entries on screen came from; see useLogViewMode. */
export type LogViewMode =
  | { kind: 'tail' }
  | { kind: 'window'; targetMs: number | null; offset: number; bytes: number; atStart: boolean; atEnd: boolean }
  | { kind: 'search'; pattern: string; matches: number; scanned: 'whole' | 'partial'; durationMs: number; timedOut: boolean }

/** Whether whole-file search may run right now, and if not, why. */
export interface SearchAvailability {
  available: boolean
  reason?: string
}
