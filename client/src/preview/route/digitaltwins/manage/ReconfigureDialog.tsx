/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

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
import { RootState } from 'store/store';
import { FileState, saveAllFiles } from '../../../store/file.slice';
import {
  selectDigitalTwinByName,
  updateDescription,
} from '../../../store/digitalTwin.slice';
import { showSnackbar } from '../../../store/snackbar.slice';
import DigitalTwin, { formatName } from '../../../util/gitlabDigitalTwin';
import Editor from '../editor/Editor';

interface ReconfigureDialogProps {
  showDialog: boolean;
  setShowDialog: Dispatch<SetStateAction<boolean>>;
  name: string;
}

export const handleCloseReconfigureDialog = (
  setShowDialog: Dispatch<SetStateAction<boolean>>,
) => {
  setShowDialog(false);
};

function ReconfigureDialog({
  showDialog,
  setShowDialog,
  name,
}: ReconfigureDialogProps) {
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const digitalTwin = useSelector(selectDigitalTwinByName(name));
  const modifiedFiles = useSelector((state: RootState) => state.files);
  const dispatch = useDispatch();

  const handleSave = () => setOpenSaveDialog(true);
  const handleCancel = () => setOpenCancelDialog(true);
  const handleCloseSaveDialog = () => setOpenSaveDialog(false);
  const handleCloseCancelDialog = () => setOpenCancelDialog(false);

  const handleConfirmSave = async () => {
    await saveChanges(modifiedFiles, digitalTwin, dispatch, name);
    setOpenSaveDialog(false);
    setShowDialog(false);
  };

  const handleConfirmCancel = () => {
    setOpenCancelDialog(false);
    setShowDialog(false);
  };

  return (
    <>
      <ReconfigureMainDialog
        showDialog={showDialog}
        setShowDialog={setShowDialog}
        name={name}
        handleCancel={handleCancel}
        handleSave={handleSave}
      />

      <ConfirmationDialog
        open={openSaveDialog}
        onClose={handleCloseSaveDialog}
        onConfirm={handleConfirmSave}
        content="Are you sure you want to apply the changes?"
      />

      <ConfirmationDialog
        open={openCancelDialog}
        onClose={handleCloseCancelDialog}
        onConfirm={handleConfirmCancel}
        content="Are you sure you want to cancel? Changes will not be applied."
      />
    </>
  );
}

export const saveChanges = async (
  modifiedFiles: FileState[],
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
  name: string,
) => {
  for (const file of modifiedFiles) {
    await handleFileUpdate(file, digitalTwin, dispatch);
  }

  showSuccessSnackbar(dispatch, name);
  dispatch(saveAllFiles());
};

export const handleFileUpdate = async (
  file: FileState,
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
) => {
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
};

const showSuccessSnackbar = (
  dispatch: ReturnType<typeof useDispatch>,
  name: string,
) => {
  dispatch(
    showSnackbar({
      message: `${formatName(name)} reconfigured successfully`,
      severity: 'success' as AlertColor,
    }),
  );
};

const ReconfigureMainDialog = ({
  showDialog,
  setShowDialog,
  name,
  handleCancel,
  handleSave,
}: {
  showDialog: boolean;
  setShowDialog: Dispatch<SetStateAction<boolean>>;
  name: string;
  handleCancel: () => void;
  handleSave: () => void;
}) => (
  <Dialog
    open={showDialog}
    onClose={() => handleCloseReconfigureDialog(setShowDialog)}
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
      <Editor DTName={name} tab={'reconfigure'} />
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

const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  content,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  content: string;
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogContent>{content}</DialogContent>
    <DialogActions>
      <Button onClick={onClose}>No</Button>
      <Button color="primary" onClick={onConfirm}>
        Yes
      </Button>
    </DialogActions>
  </Dialog>
);

export default ReconfigureDialog;
