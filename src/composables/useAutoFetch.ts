import { onUnmounted, ref } from 'vue'
import type { Connection, LogEntry } from '@/types/interfaces'
import { useApplicationStore } from '@/stores/useApplicationStore'

export interface AutoFetchInterval {
  label: string
  value: number
}

export const DefaultAutoFetchIntervals: AutoFetchInterval[] = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
]

interface UseAutoFetchOptions {
  /** A getter, so the composable follows the tab's connection rather than a snapshot of it. */
  connection: () => Connection
  /** Returns whatever arrived this tick, newest first. */
  fetchUpdates: () => Promise<LogEntry[] | void>
  intervals?: AutoFetchInterval[]
}

/**
 * Interval and countdown plumbing shared by the local and remote viewers. The
 * viewer owns the reading; this owns when it happens.
 */
export function useAutoFetch(options: UseAutoFetchOptions) {
  const applicationStore = useApplicationStore()
  const intervals = options.intervals ?? DefaultAutoFetchIntervals
  const autoFetchSeconds = ref(0)
  const countdown = ref(0)
  let autoFetchIntervalId: ReturnType<typeof setInterval> | undefined
  let countdownIntervalId: ReturnType<typeof setInterval> | undefined

  onUnmounted(() => {
    stopAutoFetch()
  })

  function setAutoFetch(seconds: number) {
    stopAutoFetch()
    autoFetchSeconds.value = seconds
    countdown.value = seconds

    countdownIntervalId = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) countdown.value = seconds
    }, 1000)

    autoFetchIntervalId = setInterval(() => {
      options.fetchUpdates()
      countdown.value = seconds
    }, seconds * 1000)

    applicationStore.autoFetching = {
      connectionId: options.connection().uid,
      intervalId: autoFetchIntervalId,
    }
  }

  function stopAutoFetch() {
    autoFetchSeconds.value = 0
    countdown.value = 0
    if (autoFetchIntervalId) clearInterval(autoFetchIntervalId)
    if (countdownIntervalId) clearInterval(countdownIntervalId)
    autoFetchIntervalId = undefined
    countdownIntervalId = undefined
    applicationStore.autoFetching = { connectionId: null, intervalId: undefined }
  }

  return { autoFetchSeconds, countdown, intervals, setAutoFetch, stopAutoFetch }
}
