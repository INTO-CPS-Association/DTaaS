import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import {
  getAllLogs,
  clearLogs,
  subscribeToLogChanges,
} from 'util/logger/indexedDBLogger';
import { LogEvent } from 'util/logger/logEvent';

function timestampValue(event: LogEvent): number {
  const parsed = Date.parse(event.timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortLogsNewestFirst(entries: LogEvent[]): LogEvent[] {
  return [...entries].sort(
    (first, second) => timestampValue(second) - timestampValue(first),
  );
}

function toJsonLines(entries: LogEvent[]): string {
  return entries.map((event) => JSON.stringify(event)).join('\n');
}

function LogViewer() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveUpdate, setLiveUpdate] = useState(false);

  const loadLogs = useCallback(async () => {
    const entries = await getAllLogs().catch(() => [] as LogEvent[]);
    setLogs(entries);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!liveUpdate) return undefined;

    loadLogs();
    return subscribeToLogChanges(loadLogs);
  }, [liveUpdate, loadLogs]);

  const handleClear = async () => {
    await clearLogs().catch(() => {});
    setLogs([]);
  };

  const handleDownload = () => {
    const jsonl = toJsonLines(displayedLogs);
    const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
    let url = '';
    try {
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dtaas-workflow-log-${new Date().toISOString().slice(0, 10)}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  const displayedLogs = sortLogsNewestFirst(logs);
  const jsonlContent = toJsonLines(displayedLogs);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Workflow Logs
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleDownload}
          disabled={logs.length === 0}
          data-testid="download-logs"
          data-logger-element="button"
          data-logger-label="Download Logs"
        >
          Download JSONL
        </Button>
        <Button
          variant="outlined"
          onClick={handleClear}
          disabled={logs.length === 0}
          data-testid="clear-logs"
          data-logger-element="button"
          data-logger-label="Clear Logs"
        >
          Clear Logs
        </Button>
        <Button
          variant="outlined"
          onClick={loadLogs}
          data-testid="refresh-logs"
          data-logger-element="button"
          data-logger-label="Refresh Logs"
        >
          Refresh
        </Button>
        <FormControlLabel
          control={
            <Switch
              checked={liveUpdate}
              onChange={(event) => setLiveUpdate(event.target.checked)}
              slotProps={{ input: { 'aria-label': 'Live update logs' } }}
              data-testid="live-update-logs"
              data-logger-element="switch"
              data-logger-label="Live Update Logs"
            />
          }
          label="Live update"
        />
      </Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {logs.length} log entries
      </Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Box
          component="pre"
          data-testid="log-content"
          sx={{
            backgroundColor: '#f5f5f5',
            p: 2,
            borderRadius: 1,
            height: '60vh',
            minHeight: 320,
            overflowY: 'auto',
            overflowX: 'auto',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {jsonlContent || 'No log entries found.'}
        </Box>
      )}
    </Box>
  );
}

export default LogViewer;
