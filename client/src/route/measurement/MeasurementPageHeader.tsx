import { Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import CollapsibleSectionHeader from 'components/CollapsibleSectionHeader';

function MeasurementPageHeader() {
  return (
    <CollapsibleSectionHeader
      title="Digital Twin Measurement"
      toggleAriaLabel="Toggle measurement description"
      toggleLoggerLabel="Toggle Measurement Description"
    >
      <Typography variant="body2" color="text.secondary">
        Run performance measurements for Digital Twin executions. Each task runs
        a number of trials to calculate average time per task. Click{' '}
        <strong>Start</strong> to begin the measurement suite,{' '}
        <strong>Stop</strong> to cancel running executions, or{' '}
        <strong>Purge</strong> to permanently delete all measurement data from
        storage. Use <strong>Export</strong> to download results at any time.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        You can navigate away from this page while a measurement is running and
        it will continue in the background. However,{' '}
        <strong>
          changing the URL, refreshing, or closing the tab will stop the
          execution
        </strong>
        {
          '. Notifications will inform you when a measurement completes or is stopped.'
        }
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        You can change the number of trials, runner tags, and Digital Twin names
        in the{' '}
        <Link
          to="/account"
          style={{ color: 'inherit' }}
          data-logger-element="link"
          data-logger-label="Measurement Settings Link"
        >
          settings
        </Link>
        .
      </Typography>
    </CollapsibleSectionHeader>
  );
}

export default MeasurementPageHeader;
