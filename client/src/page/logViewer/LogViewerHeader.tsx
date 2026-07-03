import { useState } from 'react';
import { Box, Collapse, IconButton, Tooltip, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function LogViewerHeader() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant="h5">Workflow Logs</Typography>
        <Tooltip title={expanded ? 'Hide description' : 'Show description'}>
          <IconButton
            size="small"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label="Toggle logs description"
            data-logger-element="button"
            data-logger-label="Toggle Logs Description"
            sx={{
              color: 'text.secondary',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Collapse in={expanded}>
        <Typography variant="body2" color="text.secondary">
          Analytics events captured as you interact with the workbench. Logs are
          stored locally in your browser and never leave this device. Use{' '}
          <strong>Download</strong> to export the entries as JSONL,{' '}
          <strong>Clear Logs</strong> to permanently remove them, or{' '}
          <strong>Refresh</strong> to reload from storage.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Enable <strong>Live update</strong> to stream new events into the view
          as they are recorded. Use the filter box to narrow entries by label,
          page, element, or context; downloads export the filtered view. Toggle{' '}
          <strong>Raw view</strong> to see the entries as JSON Lines and copy
          them to the clipboard.
        </Typography>
      </Collapse>
    </Box>
  );
}

export default LogViewerHeader;
