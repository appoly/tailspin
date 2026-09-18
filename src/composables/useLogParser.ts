import { parseLogEntries } from '$/logParser'
import type { LogEntry } from '@/types/interfaces'

export async function useLogParser(logData: string): Promise<LogEntry[]> {
  try {
    return parseLogEntries(logData)
  } catch (error: any) {
    throw error?.message ?? 'An Error has Occurred'
  }
}
