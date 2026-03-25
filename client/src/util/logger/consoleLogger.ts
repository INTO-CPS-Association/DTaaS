/* eslint-disable no-console */
import { LogEvent } from 'util/logger/logEvent';

const logBuffer: LogEvent[] = [];

export function logToConsole(event: LogEvent): void {
  logBuffer.push(event);
  console.log(JSON.stringify(event));
}

export function getLogBuffer(): readonly LogEvent[] {
  return logBuffer;
}

export function clearLogBuffer(): void {
  logBuffer.length = 0;
}

export function downloadLogs(): void {
  const jsonl = logBuffer.map((e) => JSON.stringify(e)).join('\n');
  const blob = new Blob([jsonl], { type: 'application/jsonl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dtaas-workflow-log-${new Date().toISOString().slice(0, 10)}.jsonl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
