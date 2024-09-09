import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import React, { Dispatch, SetStateAction } from 'react';

interface LogDialogProps {
  showLog: boolean;
  setShowLog: Dispatch<SetStateAction<boolean>>;
  name: string;
  executionCount: number;
  jobLogs: { jobName: string; log: string }[];
}

const handleCloseLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
  setShowLog(false);
};

function LogDialog({
  showLog,
  setShowLog,
  name,
  executionCount,
  jobLogs,
}: LogDialogProps) {
  return (
    <Dialog
      open={showLog}
      onClose={() => handleCloseLog(setShowLog)}
      maxWidth="md"
    >
      <DialogTitle>{`${name} - log (run #${executionCount})`}</DialogTitle>
      <DialogContent dividers>
        {jobLogs.length > 0 ? (
          jobLogs.map((jobLog, index) => (
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
