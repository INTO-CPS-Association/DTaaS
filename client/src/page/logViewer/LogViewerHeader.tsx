import { Typography } from '@mui/material';
import CollapsibleSectionHeader from 'components/CollapsibleSectionHeader';

function LogViewerHeader() {
  const remoteLoggingConfigured = Boolean(globalThis.env?.LOGGER_URL?.trim());

  return (
    <CollapsibleSectionHeader
      title="Workflow Logs"
      toggleAriaLabel="Toggle logs description"
      toggleLoggerLabel="Toggle Logs Description"
      disableLogging
    >
      <Typography variant="body2" color="text.secondary">
        Analytics events captured as you interact with the workbench. Logs are
        stored locally in your browser
        {remoteLoggingConfigured
          ? " and are also sent to your organization's configured logging server"
          : ' and never leave this device'}
        . Use <strong>Download</strong> to export the entries as JSONL,{' '}
        <strong>Clear Logs</strong> to permanently remove them, or{' '}
        <strong>Refresh</strong> to reload from storage.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Enable <strong>Live update</strong> to stream new events into the view
        as they are recorded. Use the filter box to narrow entries by label,
        page, element, or context; downloads export the filtered view. Toggle{' '}
        <strong>Raw view</strong> to see the entries as JSON Lines and copy them
        to the clipboard.
      </Typography>
    </CollapsibleSectionHeader>
  );
}

export default LogViewerHeader;
