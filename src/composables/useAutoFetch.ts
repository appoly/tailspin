import { onUnmounted, ref } from 'vue'
import type { Connection, LogEntry } from '@/types/interfaces'
import { StorageAPI } from '@/lib/backend'
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

/** The severities worth interrupting someone who is looking at another tab. */
const NotifiableSeverities = ['error', 'critical', 'alert', 'emergency']

interface UseAutoFetchOptions {
  /** A getter, so the composable follows the tab's connection rather than a snapshot of it. */
  connection: () => Connection
  /** Returns whatever arrived this tick, newest first, so new errors can be announced. */
  fetchUpdates: () => Promise<LogEntry[] | void>
  intervals?: AutoFetchInterval[]
}

/**
 * Interval, countdown and notification plumbing shared by the local and remote
 * viewers. The viewer owns the reading; this owns when it happens and what to
 * do about errors that turn up while the tab is in the background.
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
      tick()
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

  async function tick() {
    const entries = await options.fetchUpdates()
    if (entries?.length) await announceErrors(entries)
  }

  async function announceErrors(entries: LogEntry[]) {
    const errors = entries.filter(entry => NotifiableSeverities.includes(entry.severity.toLowerCase()))
    if (!errors.length) return

    const connection = options.connection()
    applicationStore.addUnseenErrors(connection.uid, errors.length)

    // Read the preference per burst rather than once at setup, so changing it in
    // Settings takes effect on tabs that are already polling.
    if ((await StorageAPI.Get('app.notifyOnErrors', true)) === false) return
    if (!(await ensureNotificationPermission())) return

    const notification = new Notification(connection.name, {
      body: `${errors.length} new error${errors.length === 1 ? '' : 's'}: ${summarise(errors[0])}`,
    })
    notification.onclick = () => {
      window.focus()
      applicationStore.goToConnection(connection.uid)
    }
  }

  return { autoFetchSeconds, countdown, intervals, setAutoFetch, stopAutoFetch }
}

/** The first line of the entry, short enough to survive an OS notification. */
function summarise(entry: LogEntry): string {
  const line = entry.text.split('\n')[0].trim()
  return line.length > 100 ? `${line.slice(0, 99).trimEnd()}…` : line
}

/**
 * Asked for only once an error has actually turned up, so a tab that never sees
 * one never prompts. A refusal is permanent for the install, hence no retry.
 */
async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}
