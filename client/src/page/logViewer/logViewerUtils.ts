import { LogEvent } from 'util/logger/logEvent';

function timestampValue(event: LogEvent): number {
  const parsed = Date.parse(event.timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toDisplayOrder(event: LogEvent) {
  const {
    timestamp,
    event: eventType,
    label,
    element,
    page,
    context,
    sessionId,
    userHash,
  } = event;
  return {
    timestamp,
    event: eventType,
    label,
    element,
    page,
    context,
    sessionId,
    userHash,
  };
}

export function sortLogsNewestFirst(entries: LogEvent[]): LogEvent[] {
  return [...entries].sort(
    (first, second) => timestampValue(second) - timestampValue(first),
  );
}

export function toJsonLines(entries: LogEvent[]): string {
  return entries.map((event) => JSON.stringify(event)).join('\n');
}

export function toDisplayJsonLines(entries: LogEvent[]): string {
  return entries
    .map((event) => JSON.stringify(toDisplayOrder(event)))
    .join('\n');
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

export function matchesFilter(event: LogEvent, query: string): boolean {
  return [
    event.event,
    event.label,
    event.element,
    event.page,
    ...Object.entries(event.context ?? {}).flat(),
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export function scheduleLogLoad(loadLogs: () => Promise<void>): () => void {
  const timer = window.setTimeout(() => {
    loadLogs().catch(() => {});
  }, 0);
  return () => window.clearTimeout(timer);
}
