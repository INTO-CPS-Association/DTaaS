/* eslint-disable no-console */

import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Typography,
  } from '@mui/material';
  import React, { Dispatch, SetStateAction } from 'react';
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from 'store/digitalTwin.slice';
import DigitalTwin from 'util/gitlabDigitalTwin';
  
  interface DeleteDialogProps {
    showLog: boolean;
    setShowLog: Dispatch<SetStateAction<boolean>>;
    name: string;
  }
  
  const handleCloseLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
    setShowLog(false);
  };
  
  const handleDelete = async (digitalTwin: DigitalTwin, setShowLog: Dispatch<SetStateAction<boolean>>) => {
    await digitalTwin.delete();
    setShowLog(false);
  }

  function DetailsDialog({
    showLog,
    setShowLog,
    name,
  }: DeleteDialogProps) {
    const digitalTwin = useSelector(selectDigitalTwinByName(name));
    console.log(digitalTwin);
    return (
      <Dialog
        open={showLog}
        onClose={() => handleCloseLog(setShowLog)}
        maxWidth="md"
      >
        <DialogContent>
        <Typography variant="body2">This step is irreversible. Would you like to delete {name} digital twin?</Typography>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={() => handleCloseLog(setShowLog)}>
            Cancel
          </Button>
          <Button color="primary" onClick={() => handleDelete(digitalTwin, setShowLog)}>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
  
  export default DetailsDialog;
  