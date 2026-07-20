import { useMemo, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import Layout from 'page/Layout';
import Filter from 'components/asset/Filter';
import LogViewerHeader from 'page/logViewer/LogViewerHeader';
import LogViewerControls from 'page/logViewer/LogViewerControls';
import LogViewerContent from 'page/logViewer/LogViewerContent';
import ClearLogsDialog from 'page/logViewer/ClearLogsDialog';
import useLogs from 'page/logViewer/useLogs';
import { clearLogs } from 'util/logger/indexedDBLogger';
import {
  downloadJsonLines,
  getCountText,
  getDownloadLabel,
  matchesFilter,
  sortLogsNewestFirst,
} from 'page/logViewer/logViewerUtils';

function LogViewer() {
  const [liveUpdate, setLiveUpdate] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [rawView, setRawView] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const { logs, loading, loadLogs, setLogs } = useLogs(liveUpdate);

  const query = filterText.trim().toLowerCase();
  const filtered = query.length > 0;
  const displayedLogs = useMemo(
    () =>
      sortLogsNewestFirst(
        filtered ? logs.filter((event) => matchesFilter(event, query)) : logs,
      ),
    [logs, filtered, query],
  );

  const handleClear = async () => {
    await clearLogs().catch(() => {});
    setLogs([]);
    setClearConfirmOpen(false);
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
              flexWrap: 'wrap',
              alignItems: 'center',
              columnGap: 1.5,
              rowGap: 1,
            }}
          >
            <Filter
              placeholder="Filter logs"
              value={filterText}
              onChange={setFilterText}
              disableLogging
              sx={{ marginTop: 0 }}
            />
            <LogViewerControls
              downloadLabel={getDownloadLabel(filtered)}
              onDownload={() => downloadJsonLines(displayedLogs)}
              downloadDisabled={displayedLogs.length === 0}
              onClearClick={() => setClearConfirmOpen(true)}
              clearDisabled={logs.length === 0}
              onRefresh={loadLogs}
              rawView={rawView}
              onToggleRawView={() => setRawView((prev) => !prev)}
              liveUpdate={liveUpdate}
              onLiveUpdateChange={setLiveUpdate}
            />
          </Box>
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
              {getCountText(displayedLogs.length, logs.length, filtered)}
            </Typography>
          </Box>
          <LogViewerContent
            loading={loading}
            entries={displayedLogs}
            rawView={rawView}
            filtered={filtered}
          />
        </Paper>
      </Box>
    </Layout>
  );
}

export default LogViewer;
