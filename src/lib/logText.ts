// Pure text helpers for the log viewer: stable row keys, search highlighting,
// stack-trace/JSON structure and timestamp maths. Nothing here touches the DOM
// or Vue, so it can be exercised straight from node.

import type { LogEntry } from '@/types/interfaces'

export interface HighlightSegment {
  text: string
  match: boolean
}

export type ExpandedLine =
  | { kind: 'text'; text: string }
  | { kind: 'label'; text: string }
  | { kind: 'json'; text: string }
  | { kind: 'frame'; marker: string; location: string; rest: string; vendor: boolean }

export interface ParsedTimestamp {
  millis: number
  /** `+01:00`, `Z`, or null when Laravel wrote a bare local timestamp. */
  offset: string | null
}

export type TimeZoneMode = 'server' | 'local'

/* -------------------------------------------------------------------------- */
/* Stable row keys                                                            */
/* -------------------------------------------------------------------------- */

const keyCache = new WeakMap<object, string>()
const millisCache = new WeakMap<object, number | null>()

/**
 * FNV-1a, 32-bit. Cheap enough to run over a whole stack trace and stable
 * across reloads, which is what lets an expanded row survive a refetch.
 */
export function hashText(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Row key for `v-for`. Keyed by content rather than index so auto-fetch can
 * prepend entries without the expanded row jumping to a different one.
 * Memoised per entry object; two byte-identical entries logged in the same
 * second share a key, which is harmless because they also render identically.
 */
export function entryKey(entry: LogEntry): string {
  const cached = keyCache.get(entry)
  if (cached !== undefined) return cached
  const key = `${entry.timestamp}~${hashText(entry.text)}`
  keyCache.set(entry, key)
  return key
}

/* -------------------------------------------------------------------------- */
/* Search highlighting                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Splits `text` into alternating plain/matching segments for the given term.
 * Case-insensitive, non-overlapping, left to right. Returns plain text
 * unchanged when there is nothing to highlight so callers can render fast.
 */
export function highlightSegments(text: string, term: string): HighlightSegment[] {
  const needle = term.trim().toLowerCase()
  if (!needle) return [{ text, match: false }]

  const haystack = text.toLowerCase()
  // A few characters change length when lower-cased; slicing by the lowered
  // index would then cut the original in the wrong place.
  if (haystack.length !== text.length) return [{ text, match: false }]

  const segments: HighlightSegment[] = []
  let from = 0
  let at = haystack.indexOf(needle)
  while (at !== -1) {
    if (at > from) segments.push({ text: text.slice(from, at), match: false })
    segments.push({ text: text.slice(at, at + needle.length), match: true })
    from = at + needle.length
    at = haystack.indexOf(needle, from)
  }
  if (from === 0) return [{ text, match: false }]
  if (from < text.length) segments.push({ text: text.slice(from), match: false })
  return segments
}

/* -------------------------------------------------------------------------- */
/* Stack traces and JSON context                                              */
/* -------------------------------------------------------------------------- */

const FRAME_RE = /^#(\d+)\s+(.*)$/
/** `/path/to/file.php(123)` or `file.php:123` at the head of a frame. */
const FRAME_LOCATION_RE = /^(\S+?(?:\(\d+\)|:\d+))(.*)$/
/** Guards against pathological single lines; pretty-printing those is pointless. */
const MAX_JSON_LINE = 200_000

/**
 * Laravel appends its context as a JSON object on the first line. Finds the
 * left-most `{` whose tail parses, so a literal `{` in the message does not
 * throw the split off. Returns null for anything that is not valid JSON.
 */
export function splitJsonTail(line: string): { message: string; json: string } | null {
  if (line.length > MAX_JSON_LINE) return null
  const trimmed = line.trimEnd()
  if (!trimmed.endsWith('}')) return null

  let at = trimmed.indexOf('{')
  let attempts = 0
  while (at !== -1 && attempts < 32) {
    attempts++
    try {
      const parsed = JSON.parse(trimmed.slice(at))
      if (parsed && typeof parsed === 'object') {
        return {
          message: trimmed.slice(0, at).trimEnd(),
          json: JSON.stringify(parsed, null, 2),
        }
      }
    } catch {
      // Not the opening brace we are after; try the next one.
    }
    at = trimmed.indexOf('{', at + 1)
  }
  return null
}

export function classifyLine(line: string): ExpandedLine {
  if (line.trim() === '[stacktrace]') return { kind: 'label', text: line.trim() }

  const frame = line.match(FRAME_RE)
  if (!frame) return { kind: 'text', text: line }

  const remainder = frame[2]
  // `#12 {main}` closes every Laravel trace and carries no location.
  if (remainder.trim() === '{main}') return { kind: 'text', text: line }

  const located = remainder.match(FRAME_LOCATION_RE)
  return {
    kind: 'frame',
    marker: `#${frame[1]}`,
    location: located?.[1] ?? '',
    rest: located ? located[2] : remainder,
    vendor: (located?.[1] ?? '').includes('/vendor/'),
  }
}

/** Structure for the expanded `<pre>`. The raw text is what Copy still yields. */
export function buildExpandedLines(text: string): ExpandedLine[] {
  const lines = text.split('\n')
  const out: ExpandedLine[] = []

  lines.forEach((line, index) => {
    if (index === 0) {
      const split = splitJsonTail(line)
      if (split) {
        if (split.message) out.push({ kind: 'text', text: split.message })
        out.push({ kind: 'json', text: split.json })
        return
      }
    }
    out.push(classifyLine(line))
  })

  return out
}

/* -------------------------------------------------------------------------- */
/* Timestamps                                                                 */
/* -------------------------------------------------------------------------- */

const TIMESTAMP_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?\s*(Z|[+-]\d{2}:?\d{2})?$/

export function parseTimestamp(timestamp: string): ParsedTimestamp | null {
  const m = timestamp.trim().match(TIMESTAMP_RE)
  if (!m) return null

  const [, year, month, day, hour, minute, second, fraction, offset] = m
  const ms = fraction ? Math.floor(Number(`0.${fraction}`) * 1000) : 0

  if (offset) {
    const normalised = offset === 'Z' ? 'Z' : offset.includes(':') ? offset : `${offset.slice(0, 3)}:${offset.slice(3)}`
    const millis = Date.parse(
      `${year}-${month}-${day}T${hour}:${minute}:${second}.${String(ms).padStart(3, '0')}${normalised}`
    )
    return Number.isNaN(millis) ? null : { millis, offset: normalised }
  }

  // No offset: the only sane reading is wall-clock time, which is also how the
  // datetime-local inputs are interpreted, so the two compare like for like.
  const millis = new Date(
    Number(year), Number(month) - 1, Number(day),
    Number(hour), Number(minute), Number(second), ms
  ).getTime()
  return Number.isNaN(millis) ? null : { millis, offset: null }
}

/** Millisecond value for an entry, memoised per entry object. */
export function entryMillis(entry: LogEntry): number | null {
  const cached = millisCache.get(entry)
  if (cached !== undefined) return cached
  const millis = parseTimestamp(entry.timestamp)?.millis ?? null
  millisCache.set(entry, millis)
  return millis
}

export function timestampOffset(timestamp: string): string | null {
  return parseTimestamp(timestamp)?.offset ?? null
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Display form for a timestamp. Offset-less timestamps are shown verbatim —
 * there is no zone to convert from. Only offset-carrying ones can be re-based
 * onto the reader's own clock, and the entry itself is never mutated.
 */
export function formatTimestamp(timestamp: string, zone: TimeZoneMode = 'server'): string {
  const parsed = parseTimestamp(timestamp)
  if (!parsed || !parsed.offset) return timestamp

  const date = new Date(parsed.millis)
  if (zone === 'local') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

  const m = timestamp.trim().match(TIMESTAMP_RE)!
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}${parsed.offset}`
}

/** Short label for the time chip, e.g. `Sep 3 10:00`, read in `offset` if given. */
export function formatRangeLabel(millis: number, offset: string | null = null): string {
  const date = offset ? new Date(millis + offsetMillis(offset)) : new Date(millis)
  const parts = offset
    ? { month: date.getUTCMonth(), day: date.getUTCDate(), hours: date.getUTCHours(), minutes: date.getUTCMinutes() }
    : { month: date.getMonth(), day: date.getDate(), hours: date.getHours(), minutes: date.getMinutes() }
  const month = MONTHS[parts.month]
  return `${month} ${parts.day} ${pad(parts.hours)}:${pad(parts.minutes)}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * `2026-09-04T10:00` from a datetime-local input. Read in `offset` when the
 * entries carry one, so the bounds line up with what is on screen.
 */
export function datetimeLocalToMillis(value: string, offset: string | null = null): number | null {
  if (!value) return null
  const withSeconds = /T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value
  const millis = offset
    ? Date.parse(`${withSeconds}${offset}`)
    : parseTimestamp(withSeconds)?.millis ?? NaN
  return Number.isNaN(millis) ? null : millis
}

/** Inverse of the above, for seeding the inputs from a preset. */
export function millisToDatetimeLocal(millis: number, offset: string | null = null): string {
  if (!offset) {
    const date = new Date(millis)
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  // Shift into the server's zone, then read the UTC fields as wall-clock time.
  const shifted = new Date(millis + offsetMillis(offset))
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T` +
    `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
}

function offsetMillis(offset: string): number {
  if (offset === 'Z') return 0
  const sign = offset.startsWith('-') ? -1 : 1
  const [hours, minutes] = offset.slice(1).split(':').map(Number)
  return sign * (hours * 60 + (minutes || 0)) * 60_000
}

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

export function formatEntryLine(entry: LogEntry): string {
  return `[${entry.timestamp}] ${entry.environment}.${entry.severity}: ${entry.text}`
}

/** Entries arrive newest-first; an exported log reads oldest-first. */
export function buildExportText(entries: LogEntry[]): string {
  return [...entries].reverse().map(formatEntryLine).join('\n') + '\n'
}

export function buildExportJson(entries: LogEntry[]): string {
  return JSON.stringify([...entries].reverse(), null, 2)
}

export function exportFilename(extension: string, now: Date = new Date()): string {
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `tailspin-export-${stamp}.${extension}`
}
