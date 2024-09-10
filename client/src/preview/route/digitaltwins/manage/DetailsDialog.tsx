import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Typography,
  } from '@mui/material';
import markdownit from 'markdown-it'
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from 'store/digitalTwin.slice';

  interface DetailsDialogProps {
    showLog: boolean;
    setShowLog: Dispatch<SetStateAction<boolean>>;
    name: string;
  }
  
  const handleCloseLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
    setShowLog(false);
  };
  
  function DetailsDialog({
    showLog,
    setShowLog,
    name,
  }: DetailsDialogProps) {
    const digitalTwin = useSelector(selectDigitalTwinByName(name));
    const md = markdownit();
    return (
      <Dialog
        open={showLog}
        onClose={() => handleCloseLog(setShowLog)}
        maxWidth="md"
      >
        <DialogContent dividers>
        <Typography variant="body2">
        {md.render(digitalTwin.fullDescription)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCloseLog(setShowLog)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
  
  export default DetailsDialog;
  