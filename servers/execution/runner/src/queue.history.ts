import type { HistoryEntryDto } from './dto/history.dto.js';
import type { CommandCounts, ResourceTotals } from './dto/metrics.dto.js';
import type { CommandStateStatus } from './dto/state.dto.js';
import type { CommandRecord } from './interfaces/command.interface.js';
import type { ScriptResources } from './resources/resources.js';

const RESOURCES =
  'cpu_seconds AS cpuSeconds, peak_rss_bytes AS peakRssBytes, processes';

// The table keeps SQLite's YYYY-MM-DD HH:MM:SS times, which the query
// turns into ISO 8601 UTC; strftime of NULL is NULL
export const RECORD = `SELECT id, name, status, stdout, stderr,
  exit_code AS exitCode, ${RESOURCES},
  strftime('%Y-%m-%dT%H:%M:%fZ', received_at) AS receivedAt,
  strftime('%Y-%m-%dT%H:%M:%fZ', finished_at) AS finishedAt,
  finished_at IS NOT NULL AS finished FROM commands`;

export const RECORD_BY_KEY = `${RECORD} WHERE id =
  (SELECT command_id FROM request_keys WHERE request_key = ?)`;

// The status of a command as GET /state reports it: running until it
// finishes, as commandState of the state document has it
const STATUS = `CASE WHEN finished_at IS NULL THEN 'running' ELSE status END`;

// The newest rows received since the time given, to the second, oldest
// first; every row without a time, and none for a time that datetime
// can not read, as a comparison with NULL is never true
export const HISTORY = `SELECT * FROM (
  SELECT id, name, ${STATUS} AS status, exit_code AS exitCode,
    strftime('%Y-%m-%dT%H:%M:%fZ', received_at) AS receivedAt,
    strftime('%Y-%m-%dT%H:%M:%fZ', finished_at) AS finishedAt, by,
    ${RESOURCES}
  FROM commands
  WHERE :since IS NULL OR received_at >= datetime(:since)
  ORDER BY id DESC LIMIT :limit) ORDER BY id`;

// The rows above an id, by status
export const COMMAND_COUNTS = `SELECT ${STATUS} AS status,
  COUNT(*) AS count FROM commands WHERE id > ? GROUP BY 1`;

export const LAST_ID = 'SELECT COALESCE(MAX(id), 0) AS id FROM commands';

// The rows above an id with a figure, by name: the sum of their CPU
// seconds, to the millisecond, the largest of their peaks and the
// largest of their trees
export const RESOURCE_TOTALS = `SELECT name,
  ROUND(SUM(cpu_seconds), 3) AS cpuSeconds,
  MAX(peak_rss_bytes) AS peakRssBytes, MAX(processes) AS processes
  FROM commands
  WHERE id > ? AND (cpu_seconds IS NOT NULL OR peak_rss_bytes IS NOT NULL)
  GROUP BY name ORDER BY name`;

const toResources = (row: Record<string, unknown>): ScriptResources => ({
  cpuSeconds: row.cpuSeconds as number | null,
  peakRssBytes: row.peakRssBytes as number | null,
  processes: row.processes as number | null,
});

export function toRecord(
  row: Record<string, unknown> | undefined,
): CommandRecord | undefined {
  if (row === undefined) {
    return undefined;
  }
  return {
    id: Number(row.id),
    name: String(row.name),
    status: String(row.status),
    stdout: String(row.stdout),
    stderr: String(row.stderr),
    exitCode: row.exitCode as number | null,
    resources: toResources(row),
    finished: Boolean(row.finished),
    receivedAt: String(row.receivedAt),
    finishedAt: row.finishedAt as string | null,
  };
}

export const toHistoryEntry = (
  row: Record<string, unknown>,
): HistoryEntryDto => ({
  id: Number(row.id),
  name: String(row.name),
  status: row.status as CommandStateStatus,
  exitCode: row.exitCode as number | null,
  receivedAt: String(row.receivedAt),
  finishedAt: row.finishedAt as string | null,
  by: row.by as string | null,
  resources: toResources(row),
});

// Every status, from the rows of COMMAND_COUNTS and the number of rows
// that this start marked interrupted
export function toCommandCounts(
  rows: Record<string, unknown>[],
  interrupted: number,
): CommandCounts {
  const counts: CommandCounts = {
    valid: 0,
    failed: 0,
    stopped: 0,
    invalid: 0,
    interrupted,
    running: 0,
  };
  rows.forEach(({ status, count }) => {
    counts[status as CommandStateStatus] += Number(count);
  });
  return counts;
}

export const toResourceTotals = (
  rows: Record<string, unknown>[],
): ResourceTotals =>
  Object.fromEntries(rows.map((row) => [String(row.name), toResources(row)]));
