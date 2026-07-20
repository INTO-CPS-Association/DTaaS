import { useCallback, useEffect, useState } from 'react';
import { getAllLogs, subscribeToLogChanges } from 'util/logger/indexedDBLogger';
import { LogEvent } from 'util/logger/logEvent';
import { scheduleLogLoad } from 'page/logViewer/logViewerUtils';

interface UseLogsResult {
  logs: LogEvent[];
  loading: boolean;
  loadLogs: () => Promise<void>;
  setLogs: (logs: LogEvent[]) => void;
}

const LIVE_UPDATE_DEBOUNCE_MS = 250;

type LogLoader = () => Promise<void>;

interface DebouncedReload {
  schedule: () => void;
  cleanup: () => void;
}

function ignoreLoadError(): void {
  return undefined;
}

function createDebouncedReload(loadLogs: LogLoader): DebouncedReload {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const runReload = () => {
    timer = null;
    loadLogs().catch(ignoreLoadError);
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(runReload, LIVE_UPDATE_DEBOUNCE_MS);
  };

  const cleanup = () => {
    if (timer) clearTimeout(timer);
  };

  return { schedule, cleanup };
}

function useLogState(): UseLogsResult {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    const entries = await getAllLogs().catch(() => [] as LogEvent[]);
    setLogs(entries);
    setLoading(false);
  }, []);

  useEffect(() => scheduleLogLoad(loadLogs), [loadLogs]);

  return { logs, loading, loadLogs, setLogs };
}

function useLiveLogUpdates(liveUpdate: boolean, loadLogs: LogLoader): void {
  useEffect(() => {
    if (!liveUpdate) return undefined;

    // Coalesce bursts of change events (a single click can log a click and
    // a change) into one full store re-read.
    const reload = createDebouncedReload(loadLogs);
    const unsubscribe = subscribeToLogChanges(reload.schedule);
    return () => {
      unsubscribe();
      reload.cleanup();
    };
  }, [liveUpdate, loadLogs]);
}

function useLogs(liveUpdate: boolean): UseLogsResult {
  const logState = useLogState();
  useLiveLogUpdates(liveUpdate, logState.loadLogs);
  return logState;
}

export default useLogs;
