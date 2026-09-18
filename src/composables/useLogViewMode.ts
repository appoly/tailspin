import { ref, type Ref } from 'vue'
import type { LogEntry, LogViewMode } from '@/types/interfaces'
import type { WindowTarget } from '@/lib/backend'
import type { SearchOutcome, WindowRead } from '$/search'
import { SearchDefaultLimit } from '$/search'
import { useLogParser } from '@/composables/useLogParser'

/**
 * Where the entries on screen came from. "tail" is the normal view: the newest
 * bytes of the file, polled by auto-fetch. "window" is a slice around a moment
 * reached by seeking. "search" is the matches of a whole-file search. The two
 * viewers differ only in how they talk to the file, so they hand that in as an
 * adapter and share everything else here.
 */
export interface LogViewModeAdapter {
  search(pattern: string, limit: number): Promise<SearchOutcome>
  window(target: WindowTarget, bytes: number): Promise<WindowRead>
  /** Bytes per window read: the fetch size the connection uses for its tail. */
  bytes(): number
  /** Put the tail back. */
  reloadTail(): Promise<void>
  /** Called when leaving the tail, so auto-fetch can stop. */
  onLeaveTail?(): void
}

export function useLogViewMode(
  adapter: LogViewModeAdapter,
  entries: Ref<LogEntry[]>,
  isLoading: Ref<boolean>,
) {
  const mode = ref<LogViewMode>({ kind: 'tail' })
  const busy = ref(false)
  /** A one-line status for the search affordance: refusals, rate limit, empty results. */
  const notice = ref('')

  function resetToTail() {
    mode.value = { kind: 'tail' }
    notice.value = ''
  }

  async function searchWholeFile(pattern: string) {
    if (busy.value) return
    busy.value = true
    notice.value = ''
    try {
      const outcome = await adapter.search(pattern, SearchDefaultLimit)
      if (!outcome.success) {
        notice.value = outcome.message ?? 'Search failed.'
        return
      }
      if (mode.value.kind === 'tail') adapter.onLeaveTail?.()
      entries.value = outcome.entries
      mode.value = {
        kind: 'search',
        pattern,
        matches: outcome.entries.length,
        scanned: outcome.scanned,
        durationMs: outcome.durationMs,
        timedOut: outcome.timedOut,
      }
    } finally {
      busy.value = false
    }
  }

  async function loadWindow(target: WindowTarget, targetMs: number | null) {
    if (busy.value) return
    busy.value = true
    isLoading.value = true
    notice.value = ''
    try {
      const bytes = adapter.bytes()
      const read = await adapter.window(target, bytes)
      if (!read.success) {
        notice.value = read.message ?? 'Could not read that part of the file.'
        return
      }
      if (mode.value.kind === 'tail') adapter.onLeaveTail?.()
      entries.value = await useLogParser(read.content)
      mode.value = { kind: 'window', targetMs, offset: read.offset, bytes, atStart: read.atStart, atEnd: read.atEnd }
    } finally {
      isLoading.value = false
      busy.value = false
    }
  }

  /** Seek to a moment (clock millis as written in the log) and show the bytes around it. */
  function jumpToTime(targetMs: number) {
    return loadWindow({ targetMs }, targetMs)
  }

  /** Page the window one fetch size earlier (-1) or later (+1). */
  function shiftWindow(direction: -1 | 1) {
    if (mode.value.kind !== 'window') return Promise.resolve()
    const { offset, bytes, targetMs } = mode.value
    const next = Math.max(0, offset + direction * bytes)
    return loadWindow({ offset: next }, targetMs)
  }

  async function exitMode() {
    if (mode.value.kind === 'tail') return
    resetToTail()
    isLoading.value = true
    try {
      await adapter.reloadTail()
    } finally {
      isLoading.value = false
    }
  }

  return { mode, busy, notice, searchWholeFile, jumpToTime, shiftWindow, exitMode, resetToTail }
}
