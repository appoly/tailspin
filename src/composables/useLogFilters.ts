import { computed, ref, watch, type Ref } from 'vue'
import type { LogEntry } from '@/types/interfaces'
import { timestampOffset, type TimeZoneMode } from '@/lib/logText'
import { boundsLabel, matchesTime, selectionBounds, summarizeLogTimes, type TimeSelection } from '@/lib/logTimeFilter'
import { debounce } from '@/helpers'

export function useLogFilters(entries: Ref<LogEntry[]>) {
  const searchTerm = ref('')
  const activeSearch = ref('')
  const selectedSeverity = ref('')
  const selection = ref<TimeSelection | null>(null)
  const timezone = ref<TimeZoneMode>('server')
  const applySearch = debounce((value: string) => { activeSearch.value = value }, 250)
  watch(searchTerm, value => applySearch(value))

  const canSwitchTimezone = computed(() => entries.value.slice(0, 200).some(entry => timestampOffset(entry.timestamp)))
  const timeSummary = computed(() => summarizeLogTimes(entries.value, timezone.value))
  const range = computed(() => selection.value ? selectionBounds(selection.value) : null)
  const isRangeActive = computed(() => range.value !== null)
  const rangeLabel = computed(() => range.value ? boundsLabel(range.value, timeSummary.value.days.length > 1) : '')

  const searchFiltered = computed(() => {
    const needle = activeSearch.value.toLowerCase()
    return entries.value.filter(item =>
      (!selectedSeverity.value || item.severity === selectedSeverity.value) &&
      (!needle || item.text.toLowerCase().includes(needle) ||
        item.severity.toLowerCase().includes(needle) || item.timestamp.includes(needle))
    )
  })
  const filtered = computed(() => {
    const bounds = range.value
    return bounds ? searchFiltered.value.filter(item => matchesTime(item, bounds, timezone.value)) : searchFiltered.value
  })

  function previewCount(candidate: TimeSelection): number {
    const bounds = selectionBounds(candidate)
    if (!bounds) return 0
    let count = 0
    for (const item of searchFiltered.value) if (matchesTime(item, bounds, timezone.value)) count++
    return count
  }
  function setSelection(value: TimeSelection) { selection.value = { ...value } }
  function clearRange() { selection.value = null }

  return {
    searchTerm, activeSearch, selectedSeverity, selection, timezone, canSwitchTimezone,
    timeSummary, range, isRangeActive, rangeLabel, filtered, previewCount, setSelection, clearRange,
  }
}
