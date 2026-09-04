import type { LogFile } from '@/types/interfaces'

export function selectRandomFromArray(array: string[]): string {
  return array[Math.floor(Math.random() * array.length)]
}

export function unproxify(val: any) {
  return JSON.parse(JSON.stringify(val))
}

export function kilobytesToHumanReadableFileSize(kilobytes: number): string {
  if (kilobytes < 1024) return `${kilobytes.toFixed(2)} Kb`
  else if (kilobytes < 1024 * 1024) return `${(kilobytes / 1024).toFixed(2)} Mb`
  else return `${(kilobytes / (1024 * 1024)).toFixed(2)} Gb`
}

export function bytesToHumanReadableFileSize(bytes: number): string {
  return kilobytesToHumanReadableFileSize(bytes / 1024)
}

export function basename(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '')
  const index = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return index === -1 ? trimmed : trimmed.slice(index + 1)
}

/** Rough, friendly "when was this touched" for a unix timestamp in seconds. */
export function relativeTimeFromUnix(seconds: number): string {
  if (!seconds) return ''

  const elapsed = Date.now() / 1000 - seconds
  if (elapsed < 0) return 'just now'
  if (elapsed < 60) return 'just now'
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)} min ago`
  if (elapsed < 86400) {
    const hours = Math.floor(elapsed / 3600)
    return `${hours} hr${hours === 1 ? '' : 's'} ago`
  }
  if (elapsed < 172800) return 'yesterday'
  if (elapsed < 2592000) return `${Math.floor(elapsed / 86400)} days ago`

  return new Date(seconds * 1000).toLocaleDateString()
}

/**
 * Parse the remote listing, one "<mtime> <size> <path>" line per file, into the
 * same shape the local lister returns. Already sorted newest first by the shell.
 */
export function parseRemoteLogFiles(output: string): LogFile[] {
  const files: LogFile[] = []

  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // The path is everything after the first two columns, so filenames with
    // spaces survive; only mtime and size are split off.
    const match = trimmed.match(/^(\d+)\s+(\d+)\s+(.+)$/)
    if (!match) continue

    const path = match[3]
    const name = basename(path)
    if (!isLogFileName(name)) continue

    files.push({
      name,
      path,
      size: parseInt(match[2], 10) || 0,
      modified: parseInt(match[1], 10) || 0,
      compressed: name.toLowerCase().endsWith('.gz'),
    })
  }

  return files
}

const ignoredLogSuffixes = ['.swp', '.swo', '.swn', '.tmp', '~']

/** "*.log*", so rotated and gzipped logs count, minus the obvious scratch files. */
export function isLogFileName(name: string): boolean {
  if (name.startsWith('.') || !name.includes('.log')) return false
  return !ignoredLogSuffixes.some(suffix => name.endsWith(suffix))
}

/** A file that is not the live "*.log" will never gain another line. */
export function isRotatedLogName(name: string): boolean {
  return !name.toLowerCase().endsWith('.log')
}

export function debounce(fn: (...args: any[]) => void, time: number): (...args: any[]) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null
  return function wrapper(...args: any[]) {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      timeoutId = null
      fn(...args)
    }, time)
  }
}
