import { LogStatuses } from '@/constants/LogStatuses'
import type { LogEntry } from '@/types/interfaces'

const dateTimestampRegex = /^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})\.?(\d{6})?([\+\-]\d\d:\d\d)?\]/
const environmentRegex = /(.*?(\w+)\.|.*?)/
const severityRegex = '(' + LogStatuses.join('|') + ')?: '
const logTextRegex = /(.*?)$/

const logParsingRegex = new RegExp(
  dateTimestampRegex.source + environmentRegex.source + severityRegex + logTextRegex.source,
  'i'
)

export async function useLogParser(logData: string): Promise<LogEntry[]> {
  return new Promise((resolve, reject) => {
    try {
      const logEntries = logData.split(/[\r\n]+/).filter((line) => line.trim() !== '')
      const parsedEntries: LogEntry[] = []
      let entryIndex = 0

      for (let i = 0; i < logEntries.length; i++) {
        const entry = logEntries[i]
        if (entryIndex === 0 && !entry.match(dateTimestampRegex)) continue

        // Keep the offset on the timestamp when Laravel wrote one: without it
        // there is no way to re-base the entry onto the reader's own clock.
        const stamp = entry.match(dateTimestampRegex)
        const timestamp = stamp ? stamp[1] + (stamp[3] ?? '') : null

        if (timestamp) {
          const matches = entry.match(logParsingRegex)
          parsedEntries[entryIndex] = {
            timestamp,
            environment: matches?.[5] ?? 'unknown',
            severity: matches?.[6] ?? 'unknown',
            text: matches?.[7] ?? '',
          }
          entryIndex++
        } else {
          parsedEntries[entryIndex - 1].text += '\n' + entry
        }
      }

      resolve(parsedEntries.reverse())
    } catch (error: any) {
      reject(error?.message ?? 'An Error has Occurred')
    }
  })
}
