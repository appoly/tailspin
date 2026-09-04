import type { Connection } from '@/types/interfaces'

// For key auth the `password` field holds the private key path, not a secret,
// so it is safe to put in a command. A real password is never included.
function keyPath(connection: Connection): string | null {
  const ssh = connection.ssh
  if (!ssh || ssh.passwordType !== 'key') return null
  const path = ssh.password?.trim()
  return path ? path : null
}

// Single-quote for POSIX shells, escaping any embedded single quotes.
function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value
  return `'${value.replace(/'/g, `'\\''`)}'`
}

// A leading "~/" has to stay outside the quotes or the shell will not expand it.
function quotePath(path: string): string {
  if (path.startsWith('~/')) return `~/${shellQuote(path.slice(2))}`
  return shellQuote(path)
}

export function buildSshCommand(connection: Connection): string {
  const ssh = connection.ssh
  if (!ssh) return ''

  const parts = ['ssh']
  if (ssh.port && ssh.port !== 22) parts.push('-p', String(ssh.port))

  const key = keyPath(connection)
  if (key) parts.push('-i', quotePath(key))

  parts.push(`${ssh.username}@${ssh.host}`)
  return parts.join(' ')
}

export function buildSshUrl(connection: Connection): string {
  const ssh = connection.ssh
  if (!ssh) return ''

  // ssh:// carries no key path; the OS terminal falls back to the agent or default key.
  const port = ssh.port && ssh.port !== 22 ? `:${ssh.port}` : ''
  return `ssh://${encodeURIComponent(ssh.username)}@${ssh.host}${port}`
}

export async function copySshCommand(connection: Connection): Promise<void> {
  await navigator.clipboard.writeText(buildSshCommand(connection))
}

export async function openInTerminal(connection: Connection): Promise<{ success: boolean; message?: string }> {
  try {
    return await window.api.Shell.openExternal(buildSshUrl(connection))
  } catch (error: any) {
    return { success: false, message: error?.message ?? 'Could not open a terminal' }
  }
}
