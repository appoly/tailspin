// Severity / search / time-range filtering for the log viewer. Kept out of the
// components so the filter bar and the table can read the same state.

import { computed, ref, watch, type Ref } from 'vue'
import type { LogEntry } from '@/types/interfaces'
import type { TimeZoneMode } from '@/lib/logText'
import {
  datetimeLocalToMillis,
  entryMillis,
  formatRangeLabel,
  millisToDatetimeLocal,
  timestampOffset,
} from '@/lib/logText'
import { debounce } from '@/helpers'

export type TimePreset = '' | '15m' | '1h' | '24h' | 'today'

const PRESET_SPANS: Record<Exclude<TimePreset, '' | 'today'>, number> = {
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '24h': 24 * 60 * 60_000,
}

const PRESET_LABELS: Record<Exclude<TimePreset, ''>, string> = {
  '15m': 'Last 15m',
  '1h': 'Last 1h',
  '24h': 'Last 24h',
  today: 'Today',
}

/** How many entries to sniff for a timezone offset; a file either has them or it doesn't. */
const OFFSET_SAMPLE = 200

export function useLogFilters(entries: Ref<LogEntry[]>) {
  const searchTerm = ref('')
  const activeSearch = ref('')
  const selectedSeverity = ref('')
  const preset = ref<TimePreset>('')
  const from = ref('')
  const to = ref('')
  const timezone = ref<TimeZoneMode>('server')

  const applySearch = debounce((value: string) => { activeSearch.value = value }, 250)
  watch(searchTerm, value => applySearch(value))

  /** The offset the log itself was written in, if it wrote one at all. */
  const serverOffset = computed(() => {
    const sample = entries.value.slice(0, OFFSET_SAMPLE)
    for (const entry of sample) {
      const offset = timestampOffset(entry.timestamp)
      if (offset) return offset
    }
    return null
  })

  const canSwitchTimezone = computed(() => serverOffset.value !== null)

  /** Zone the From/To inputs and the chip label are read in. */
  const inputOffset = computed(() =>
    timezone.value === 'local' ? null : serverOffset.value
  )

  /**
   * Presets hang off the newest entry rather than the wall clock: most logs
   * being read are rotated or hours stale, and "last 15 minutes of now" would
   * match nothing.
   */
  const newestMillis = computed(() => {
    let newest: number | null = null
    for (const entry of entries.value) {
      const millis = entryMillis(entry)
      if (millis !== null && (newest === null || millis > newest)) newest = millis
    }
    return newest
  })

  const range = computed<{ from: number | null; to: number | null }>(() => {
    if (preset.value) {
      const anchor = newestMillis.value
      if (anchor === null) return { from: null, to: null }
      if (preset.value === 'today') {
        const day = millisToDatetimeLocal(anchor, inputOffset.value).slice(0, 10)
        return { from: datetimeLocalToMillis(`${day}T00:00`, inputOffset.value), to: null }
      }
      return { from: anchor - PRESET_SPANS[preset.value], to: null }
    }
    return {
      from: datetimeLocalToMillis(from.value, inputOffset.value),
      to: datetimeLocalToMillis(to.value, inputOffset.value),
    }
  })

  const isRangeActive = computed(() => range.value.from !== null || range.value.to !== null)

  const rangeLabel = computed(() => {
    if (preset.value) return PRESET_LABELS[preset.value]
    const { from: lower, to: upper } = range.value
    if (lower !== null && upper !== null) {
      return `${formatRangeLabel(lower, inputOffset.value)} → ${formatRangeLabel(upper, inputOffset.value)}`
    }
    if (lower !== null) return `After ${formatRangeLabel(lower, inputOffset.value)}`
    if (upper !== null) return `Before ${formatRangeLabel(upper, inputOffset.value)}`
    return ''
  })

  const filtered = computed(() => {
    let items = entries.value

    if (selectedSeverity.value) {
      items = items.filter(item => item.severity === selectedSeverity.value)
    }

    const { from: lower, to: upper } = range.value
    if (lower !== null || upper !== null) {
      items = items.filter(item => {
        const millis = entryMillis(item)
        if (millis === null) return false
        if (lower !== null && millis < lower) return false
        if (upper !== null && millis > upper) return false
        return true
      })
    }

    if (activeSearch.value) {
      const needle = activeSearch.value.toLowerCase()
      items = items.filter(item =>
        item.text.toLowerCase().includes(needle) ||
        item.severity.toLowerCase().includes(needle) ||
        item.timestamp.includes(needle)
      )
    }

    return items
  })

  function setPreset(value: TimePreset) {
    preset.value = value
    if (value) {
      from.value = ''
      to.value = ''
    }
  }

  function setFrom(value: string) {
    from.value = value
    preset.value = ''
  }

  function setTo(value: string) {
    to.value = value
    preset.value = ''
  }

  function clearRange() {
    preset.value = ''
    from.value = ''
    to.value = ''
  }

  return {
    searchTerm,
    activeSearch,
    selectedSeverity,
    preset,
    from,
    to,
    timezone,
    canSwitchTimezone,
    serverOffset,
    newestMillis,
    range,
    isRangeActive,
    rangeLabel,
    filtered,
    setPreset,
    setFrom,
    setTo,
    clearRange,
  }
}
