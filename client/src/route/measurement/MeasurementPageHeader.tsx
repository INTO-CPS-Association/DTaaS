import { useState } from 'react';
import { Box, Collapse, IconButton, Tooltip, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link } from 'react-router-dom';

function MeasurementPageHeader() {
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
        <Typography variant="h5">Digital Twin Measurement</Typography>
        <Tooltip title={expanded ? 'Hide description' : 'Show description'}>
          <IconButton
            size="small"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label="Toggle measurement description"
            data-logger-element="button"
            data-logger-label="Toggle Measurement Description"
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
          Run performance measurements for Digital Twin executions. Each task
          runs a number of trials to calculate average time per task. Click{' '}
          <strong>Start</strong> to begin the measurement suite,{' '}
          <strong>Stop</strong> to cancel running executions, or{' '}
          <strong>Purge</strong> to permanently delete all measurement data from
          storage. Use <strong>Export</strong> to download results at any time.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          You can navigate away from this page while a measurement is running
          and it will continue in the background. However,{' '}
          <strong>
            changing the URL, refreshing, or closing the tab will stop the
            execution
          </strong>
          {
            '. Notifications will inform you when a measurement completes or is stopped.'
          }
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          You can change the number of trials, runner tags, and Digital Twin
          names in the{' '}
          <Link to="/account" style={{ color: 'inherit' }}>
            settings
          </Link>
          .
        </Typography>
      </Collapse>
    </Box>
  );
}

export default MeasurementPageHeader;
