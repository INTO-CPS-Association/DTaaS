import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { formatName } from 'util/gitlabDigitalTwin';
import Editor from '../editor/Editor';

interface ReconfigureDialogProps {
  showLog: boolean;
  setShowLog: Dispatch<SetStateAction<boolean>>;
  name: string;
}

const handleCloseLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
  setShowLog(false);
};

const handleSave = () => {
  // console.log('Save action triggered:', editorValue);
};

const handleCancel = () => {
  // console.log('Cancel action triggered');
};

function ReconfigureDialog({
  showLog,
  setShowLog,
  name,
}: ReconfigureDialogProps) {
  return (
    <Dialog
      open={showLog}
      onClose={() => handleCloseLog(setShowLog)}
      maxWidth="lg"
    >
      <DialogTitle>
        Reconfigure <strong>{formatName(name)}</strong>
      </DialogTitle>
      <DialogContent>
        <Editor />
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button color="primary" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ReconfigureDialog;
