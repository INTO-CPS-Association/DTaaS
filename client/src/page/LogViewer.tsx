import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { getAllLogs, clearLogs } from 'util/logger/indexedDBLogger';
import { LogEvent } from 'util/logger/logEvent';

function LogViewer() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const entries = await getAllLogs().catch(() => [] as LogEvent[]);
    setLogs(entries);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleClear = async () => {
    await clearLogs().catch(() => {});
    setLogs([]);
  };

  const handleDownload = () => {
    const jsonl = logs.map((e) => JSON.stringify(e)).join('\n');
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

  const jsonlContent = logs.map((e) => JSON.stringify(e)).join('\n');

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
        >
          Download JSONL
        </Button>
        <Button
          variant="outlined"
          onClick={handleClear}
          disabled={logs.length === 0}
          data-testid="clear-logs"
        >
          Clear Logs
        </Button>
        <Button
          variant="outlined"
          onClick={loadLogs}
          data-testid="refresh-logs"
        >
          Refresh
        </Button>
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
            overflow: 'auto',
            maxHeight: '70vh',
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
