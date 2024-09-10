import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from 'store/digitalTwin.slice';
import { formatName } from 'util/gitlabDigitalTwin';

interface LogDialogProps {
  showLog: boolean;
  setShowLog: Dispatch<SetStateAction<boolean>>;
  name: string;
}

const handleCloseLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
  setShowLog(false);
};

function LogDialog({ showLog, setShowLog, name }: LogDialogProps) {
  const digitalTwin = useSelector(selectDigitalTwinByName(name));

  return (
    <Dialog
      open={showLog}
      onClose={() => handleCloseLog(setShowLog)}
      maxWidth="md"
    >
      <DialogTitle>{`${formatName(name)} - log (run #${digitalTwin.executionCount})`}</DialogTitle>
      <DialogContent dividers>
        {digitalTwin.jobLogs.length > 0 ? (
          digitalTwin.jobLogs.map((jobLog, index) => (
            <div key={index} style={{ marginBottom: '16px' }}>
              <Typography variant="h6">{jobLog.jobName}</Typography>
              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                {jobLog.log}
              </Typography>
            </div>
          ))
        ) : (
          <Typography variant="body2">No logs available</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleCloseLog(setShowLog)} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LogDialog;
