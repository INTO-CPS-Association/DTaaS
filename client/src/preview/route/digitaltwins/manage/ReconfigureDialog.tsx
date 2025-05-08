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
import {
  removeAllModifiedLibraryFiles,
  selectModifiedLibraryFiles,
} from 'preview/store/libraryConfigFiles.slice';
import { LibraryConfigFile, FileState } from 'model/backend/gitlab/interfaces';
import {
  removeAllModifiedFiles,
  selectModifiedFiles,
} from '../../../store/file.slice';
import {
  selectDigitalTwinByName,
  updateDescription,
} from '../../../store/digitalTwin.slice';
import { showSnackbar } from '../../../store/snackbar.slice';
import DigitalTwin, { formatName } from '../../../util/digitalTwin';
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
  const [fileName, setFileName] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [filePrivacy, setFilePrivacy] = useState<string>('');
  const [isLibraryFile, setIsLibraryFile] = useState<boolean>(false);
  const [libraryAssetPath, setLibraryAssetPath] = useState<string>('');
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const digitalTwin = useSelector(selectDigitalTwinByName(name));
  const modifiedFiles = useSelector(selectModifiedFiles);
  const modifiedLibraryFiles = useSelector(selectModifiedLibraryFiles);
  const dispatch = useDispatch();

  const handleSave = () => setOpenSaveDialog(true);
  const handleCancel = () => setOpenCancelDialog(true);
  const handleCloseSaveDialog = () => setOpenSaveDialog(false);
  const handleCloseCancelDialog = () => setOpenCancelDialog(false);

  const handleConfirmSave = async () => {
    await saveChanges(
      modifiedFiles,
      modifiedLibraryFiles,
      digitalTwin,
      dispatch,
      name,
    );
    setOpenSaveDialog(false);
    setShowDialog(false);
  };

  const handleConfirmCancel = () => {
    dispatch(removeAllModifiedFiles());
    dispatch(removeAllModifiedLibraryFiles());
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
        fileName={fileName}
        setFileName={setFileName}
        fileContent={fileContent}
        setFileContent={setFileContent}
        fileType={fileType}
        setFileType={setFileType}
        filePrivacy={filePrivacy}
        setFilePrivacy={setFilePrivacy}
        isLibraryFile={isLibraryFile}
        setIsLibraryFile={setIsLibraryFile}
        libraryAssetPath={libraryAssetPath}
        setLibraryAssetPath={setLibraryAssetPath}
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
  modifiedLibraryFiles: LibraryConfigFile[],
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
  name: string,
) => {
  for (const file of modifiedFiles) {
    await handleFileUpdate(file, digitalTwin, dispatch);
  }

  for (const file of modifiedLibraryFiles) {
    await handleFileUpdate(file, digitalTwin, dispatch);
  }

  showSuccessSnackbar(dispatch, name);
  dispatch(removeAllModifiedFiles());
  dispatch(removeAllModifiedLibraryFiles());
};

export const handleFileUpdate = async (
  file: FileState | LibraryConfigFile,
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  try {
    if ('assetPath' in file) {
      await digitalTwin.DTAssets.updateLibraryFileContent(
        file.fileName,
        file.fileContent,
        file.assetPath,
      );
    } else {
      await digitalTwin.DTAssets.updateFileContent(file.name, file.content);

      if (file.name === 'description.md') {
        dispatch(
          updateDescription({
            assetName: digitalTwin.DTName,
            description: file.content,
          }),
        );
      }
    }
  } catch (error) {
    const fileName = 'assetPath' in file ? file.fileName : file.name;
    dispatch(
      showSnackbar({
        message: `Error updating file ${fileName}: ${error}`,
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
  fileName,
  setFileName,
  fileContent,
  setFileContent,
  fileType,
  setFileType,
  filePrivacy,
  setFilePrivacy,
  isLibraryFile,
  setIsLibraryFile,
  libraryAssetPath,
  setLibraryAssetPath,
}: {
  showDialog: boolean;
  setShowDialog: Dispatch<SetStateAction<boolean>>;
  name: string;
  handleCancel: () => void;
  handleSave: () => void;
  fileName: string;
  setFileName: Dispatch<SetStateAction<string>>;
  fileContent: string;
  setFileContent: Dispatch<SetStateAction<string>>;
  fileType: string;
  setFileType: Dispatch<SetStateAction<string>>;
  filePrivacy: string;
  setFilePrivacy: Dispatch<SetStateAction<string>>;
  isLibraryFile: boolean;
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>;
  libraryAssetPath: string;
  setLibraryAssetPath: Dispatch<SetStateAction<string>>;
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
      <Editor
        DTName={name}
        tab={'reconfigure'}
        fileName={fileName}
        setFileName={setFileName}
        fileContent={fileContent}
        setFileContent={setFileContent}
        fileType={fileType}
        setFileType={setFileType}
        filePrivacy={filePrivacy}
        setFilePrivacy={setFilePrivacy}
        isLibraryFile={isLibraryFile}
        setIsLibraryFile={setIsLibraryFile}
        libraryAssetPath={libraryAssetPath}
        setLibraryAssetPath={setLibraryAssetPath}
      />
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
