import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import DataObjectIcon from '@mui/icons-material/DataObject';
import Layout from 'page/Layout';
import Filter from 'components/asset/Filter';
import LogEntryCard from 'page/logViewer/LogEntryCard';
import RawLogView from 'page/logViewer/RawLogView';
import LogViewerHeader from 'page/logViewer/LogViewerHeader';
import EmptyState from 'page/logViewer/EmptyState';
import ClearLogsDialog from 'page/logViewer/ClearLogsDialog';
import {
  getAllLogs,
  clearLogs,
  subscribeToLogChanges,
} from 'util/logger/indexedDBLogger';
import { LogEvent } from 'util/logger/logEvent';
import {
  matchesFilter,
  scheduleLogLoad,
  sortLogsNewestFirst,
  toJsonLines,
} from 'page/logViewer/logViewerUtils';

function LogViewer() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [rawView, setRawView] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const loadLogs = useCallback(async () => {
    const entries = await getAllLogs().catch(() => [] as LogEvent[]);
    setLogs(entries);
    setLoading(false);
  }, []);

  useEffect(() => scheduleLogLoad(loadLogs), [loadLogs]);

  useEffect(() => {
    if (!liveUpdate) return undefined;

    const cancelInitialLoad = scheduleLogLoad(loadLogs);
    const unsubscribe = subscribeToLogChanges(loadLogs);
    return () => {
      cancelInitialLoad();
      unsubscribe();
    };
  }, [liveUpdate, loadLogs]);

  const query = filterText.trim().toLowerCase();
  const displayedLogs = sortLogsNewestFirst(
    query ? logs.filter((event) => matchesFilter(event, query)) : logs,
  );
  const countText = query
    ? `${displayedLogs.length} of ${logs.length} log entries`
    : `${logs.length} log entries`;
  const downloadLabel = query
    ? 'Download Filtered JSONL'
    : 'Download All JSONL';

  const handleClear = async () => {
    await clearLogs().catch(() => {});
    setLogs([]);
    setClearConfirmOpen(false);
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

  return (
    <Layout maxWidth="xl" sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', p: 3, alignSelf: 'center' }}>
        <ClearLogsDialog
          open={clearConfirmOpen}
          logCount={logs.length}
          onCancel={() => setClearConfirmOpen(false)}
          onConfirm={handleClear}
        />
        <LogViewerHeader />
        <Paper sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                disabled={displayedLogs.length === 0}
                data-testid="download-logs"
                data-logger-element="button"
                data-logger-label="Download Logs"
              >
                {downloadLabel}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlinedIcon />}
                onClick={() => setClearConfirmOpen(true)}
                disabled={logs.length === 0}
                data-testid="clear-logs"
                data-logger-element="button"
                data-logger-label="Clear Logs"
              >
                Clear Logs
              </Button>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadLogs}
                data-testid="refresh-logs"
                data-logger-element="button"
                data-logger-label="Refresh Logs"
              >
                Refresh
              </Button>
              <Button
                variant={rawView ? 'contained' : 'outlined'}
                startIcon={<DataObjectIcon />}
                onClick={() => setRawView((prev) => !prev)}
                aria-pressed={rawView}
                data-testid="raw-view-toggle"
                data-logger-element="button"
                data-logger-label="Toggle Raw Logs"
              >
                Raw view
              </Button>
            </Box>
            <FormControlLabel
              sx={{ marginLeft: 'auto', marginRight: 0 }}
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
          <Filter
            placeholder="Filter logs"
            value={filterText}
            onChange={setFilterText}
            loggerLabel="Log filter"
          />
          <Box
            sx={{
              mt: 1.5,
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {countText}
            </Typography>
          </Box>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60vh',
                minHeight: 320,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Box
              data-testid="log-content"
              sx={{
                backgroundColor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                p: 2,
                borderRadius: 1,
                height: '60vh',
                minHeight: 320,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {displayedLogs.length === 0 && (
                <EmptyState filtered={query.length > 0} />
              )}
              {displayedLogs.length > 0 && rawView && (
                <RawLogView entries={displayedLogs} />
              )}
              {displayedLogs.length > 0 &&
                !rawView &&
                displayedLogs.map((entry, index) => (
                  <LogEntryCard
                    key={`${entry.timestamp}-${index}`}
                    entry={entry}
                  />
                ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Layout>
  );
}

export default LogViewer;
