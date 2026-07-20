import { LogEvent } from 'util/logger/logEvent';
import { collectLogContextText } from 'util/logger/contextUtils';

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
    page_transition: pageTransition,
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
    ...(pageTransition ? { page_transition: pageTransition } : {}),
    context,
    sessionId,
    userHash,
  };
}

export function sortLogsNewestFirst(entries: LogEvent[]): LogEvent[] {
  // Same-millisecond bursts are common; the store's auto-increment id keeps
  // their relative order stable across reloads.
  return [...entries].sort(
    (first, second) =>
      timestampValue(second) - timestampValue(first) ||
      (second.id ?? 0) - (first.id ?? 0),
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

export function toPrettyDisplayJson(entries: LogEvent[]): string {
  return entries
    .map((event) => JSON.stringify(toDisplayOrder(event), null, 2))
    .join('\n\n');
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
    ...collectLogContextText(event.context ?? {}),
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export function scheduleLogLoad(loadLogs: () => Promise<void>): () => void {
  const timer = globalThis.setTimeout(() => {
    loadLogs().catch(() => {});
  }, 0);
  return () => globalThis.clearTimeout(timer);
}

// Rendering tens of thousands of entries freezes the tab, so both views cap
// what they render; downloads and clipboard copies still cover every entry.
export const MAX_RENDERED_LOG_ENTRIES = 500;

export function getRenderCapNote(totalCount: number): string | null {
  if (totalCount <= MAX_RENDERED_LOG_ENTRIES) return null;
  return `Showing the newest ${MAX_RENDERED_LOG_ENTRIES} of ${totalCount} entries. Narrow the filter, or use Download to get all of them.`;
}

export function getCountText(
  displayedCount: number,
  totalCount: number,
  filtered: boolean,
): string {
  return filtered
    ? `${displayedCount} of ${totalCount} log entries`
    : `${totalCount} log entries`;
}

export function getDownloadLabel(filtered: boolean): string {
  return filtered ? 'Download Filtered JSONL' : 'Download All JSONL';
}

export function downloadJsonLines(entries: LogEvent[]): void {
  const jsonl = toJsonLines(entries);
  const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
  let url = '';
  try {
    url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dtaas-workflow-log-${new Date().toISOString().slice(0, 10)}.jsonl`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}
