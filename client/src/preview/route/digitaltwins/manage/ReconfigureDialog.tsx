import * as React from 'react';
import { useState, Dispatch, SetStateAction } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  AlertColor,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { getModifiedFiles, saveAllFiles } from '../../../store/file.slice';
import {
  selectDigitalTwinByName,
  updateDescription,
} from '../../../store/digitalTwin.slice';
import { showSnackbar } from '../../../store/snackbar.slice';
import { formatName } from '../../../util/gitlabDigitalTwin';
import Editor from '../editor/Editor';

interface ReconfigureDialogProps {
  showLog: boolean;
  setShowLog: Dispatch<SetStateAction<boolean>>;
  name: string;
}

const handleCloseLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
  setShowLog(false);
};

function ReconfigureDialog({
  showLog,
  setShowLog,
  name,
}: ReconfigureDialogProps) {
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const digitalTwin = useSelector(selectDigitalTwinByName(name));
  const modifiedFiles = useSelector(getModifiedFiles);
  const dispatch = useDispatch();

  const handleSave = () => {
    setOpenSaveDialog(true);
  };

  const handleCancel = () => {
    setOpenCancelDialog(true);
  };

  const handleCloseSaveDialog = () => {
    setOpenSaveDialog(false);
  };

  const handleCloseCancelDialog = () => {
    setOpenCancelDialog(false);
  };

  const handleConfirmSave = async () => {
    const updatePromises = modifiedFiles.map(async (file) => {
      try {
        await digitalTwin.updateFileContent(file.name, file.content);
        if (file.name === 'description.md') {
          dispatch(
            updateDescription({
              assetName: digitalTwin.DTName,
              description: file.content,
            }),
          );
        }
      } catch (error) {
        dispatch(
          showSnackbar({
            message: `Error updating file ${file.name}: ${error}`,
            severity: 'error',
          }),
        );
      }
    });

    await Promise.all(updatePromises).then(() => {
      dispatch(
        showSnackbar({
          message: `${formatName(name)} reconfigured successfully`,
          severity: 'success' as AlertColor,
        }),
      );
    });
    dispatch(saveAllFiles());

    setOpenSaveDialog(false);
    setShowLog(false);
  };

  const handleConfirmCancel = () => {
    setOpenCancelDialog(false);
    setShowLog(false);
  };

  return (
    <>
      <Dialog
        open={showLog}
        onClose={() => handleCloseLog(setShowLog)}
        fullWidth={true}
        maxWidth="lg"
        sx={{
          '& .MuiDialog-paper': {
            maxHeight: '65vh',
          },
        }}
      >
        <DialogTitle>
          Reconfigure <strong>{formatName(name)}</strong>
        </DialogTitle>
        <DialogContent>
          <Editor DTName={name} />
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

      {/* Save Confirmation Dialog */}
      <Dialog open={openSaveDialog} onClose={handleCloseSaveDialog}>
        <DialogContent>
          Are you sure you want to apply the changes?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaveDialog}>No</Button>
          <Button color="primary" onClick={handleConfirmSave}>
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={openCancelDialog} onClose={handleCloseCancelDialog}>
        <DialogContent>
          Are you sure you want to cancel? Changes will not be applied.
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog}>No</Button>
          <Button color="primary" onClick={handleConfirmCancel}>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ReconfigureDialog;