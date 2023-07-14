import { LogEntry } from "$/interfaces";
import { computed } from "vue";

export const useFilterLogs = (logs: LogEntry[], search?: string, severity?: string) => {
  let items = logs;

  if (severity) {
    items = items.filter((item: any) => item.severity === severity);
  }

  if (search) {
    const lowerSearch = search.toLowerCase();
    items = items.filter((item: any) => {
      return (
        item.text.toLowerCase().includes(lowerSearch) ||
        item.severity.toLowerCase().includes(lowerSearch) ||
        item.timestamp.includes(lowerSearch)
      );
    });
  }

  return items;
};
