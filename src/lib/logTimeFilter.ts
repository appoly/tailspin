import type { LogEntry } from '@/types/interfaces'
import { formatTimestamp, type TimeZoneMode } from './logText'

export interface TimeSelection {
  mode: 'around' | 'range'
  day: string
  time: string
  radius: number
  endDay: string
  endTime: string
}
export interface TimeBounds { from: number; to: number }
export interface LogDay { date: string; count: number; hours: number[] }
export interface LogTimeSummary { days: LogDay[]; first: string; last: string }

/** Accept the way people actually type times, without native input segments. */
export function normalizeTime(value: string): string | null {
  const match = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2})|(\d{2}))?\s*(am|pm)?$/)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2] ?? match[3] ?? 0)
  if (minute > 59) return null
  if (match[4]) {
    if (hour < 1 || hour > 12) return null
    hour = hour % 12 + (match[4] === 'pm' ? 12 : 0)
  }
  if (hour > 23) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/**
 * Compare the clock shown in the table. UTC is just a DST-free numeric axis:
 * bare server timestamps must never inherit the reader's daylight-saving gap.
 */
export function clockMillis(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) return null
  const millis = Date.parse(`${value}Z`)
  if (!Number.isFinite(millis) || new Date(millis).toISOString().slice(0, 16) !== value.slice(0, 16)) return null
  return millis
}

const clockCache = new WeakMap<LogEntry, Partial<Record<TimeZoneMode, number | null>>>()
export function entryClockMillis(entry: LogEntry, zone: TimeZoneMode): number | null {
  const cached = clockCache.get(entry) ?? {}
  if (cached[zone] !== undefined) return cached[zone]!
  const displayed = formatTimestamp(entry.timestamp, zone)
  const clock = displayed.match(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?/)
  cached[zone] = clock ? clockMillis(clock[0].replace(' ', 'T')) : null
  clockCache.set(entry, cached)
  return cached[zone]!
}

/** One cached pass over loaded entries; independent of search and severity. */
export function summarizeLogTimes(entries: LogEntry[], zone: TimeZoneMode): LogTimeSummary {
  const days = new Map<string, LogDay>()
  let first = Infinity
  let last = -Infinity
  for (const entry of entries) {
    const millis = entryClockMillis(entry, zone)
    if (millis === null) continue
    first = Math.min(first, millis)
    last = Math.max(last, millis)
    const stamp = new Date(millis).toISOString()
    const date = stamp.slice(0, 10)
    let day = days.get(date)
    if (!day) {
      day = { date, count: 0, hours: Array(24).fill(0) }
      days.set(date, day)
    }
    day.count++
    day.hours[Number(stamp.slice(11, 13))]++
  }
  return {
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    first: Number.isFinite(first) ? new Date(first).toISOString().slice(0, 16) : '',
    last: Number.isFinite(last) ? new Date(last).toISOString().slice(0, 16) : '',
  }
}

export function selectionBounds(selection: TimeSelection): TimeBounds | null {
  const time = normalizeTime(selection.time)
  const start = time ? clockMillis(`${selection.day}T${time}`) : null
  if (start === null) return null
  if (selection.mode === 'around') {
    if (!Number.isFinite(selection.radius) || selection.radius <= 0) return null
    return { from: start - selection.radius * 60_000, to: start + selection.radius * 60_000 + 59_999 }
  }
  const endTime = normalizeTime(selection.endTime)
  const end = endTime ? clockMillis(`${selection.endDay}T${endTime}`) : null
  // End minute is inclusive, including 23:59:59.999 for a whole day.
  return end === null || end < start ? null : { from: start, to: end + 59_999 }
}

export function matchesTime(entry: LogEntry, bounds: TimeBounds, zone: TimeZoneMode): boolean {
  const millis = entryClockMillis(entry, zone)
  return millis !== null && millis >= bounds.from && millis <= bounds.to
}

export function dayLabel(day: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${day}T12:00:00Z`))
}

export function boundsLabel(bounds: TimeBounds, includeDate = false): string {
  const from = new Date(bounds.from).toISOString()
  const to = new Date(bounds.to).toISOString()
  if (from.slice(0, 10) !== to.slice(0, 10)) {
    return `${dayLabel(from.slice(0, 10))} ${from.slice(11, 16)} – ${dayLabel(to.slice(0, 10))} ${to.slice(11, 16)}`
  }
  return `${includeDate ? `${dayLabel(from.slice(0, 10))} · ` : ''}${from.slice(11, 16)}–${to.slice(11, 16)}`
}
