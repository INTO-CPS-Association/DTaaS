import { useState, Dispatch, SetStateAction } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import {
  removeAllModifiedLibraryFiles,
  selectModifiedLibraryFiles,
} from 'model/store/libraryConfigFiles.slice';
import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';
import {
  removeAllModifiedFiles,
  selectModifiedFiles,
} from 'model/store/file.slice';
import { formatName } from 'model/backend/digitalTwin';
import Editor from 'route/digitaltwins/editor/Editor';

export {
  saveChanges,
  handleFileUpdate,
} from 'route/digitaltwins/manage/reconfigureDialogHandlers';

interface ReconfigureDialogProps {
  readonly showDialog: boolean;
  readonly setShowDialog: Dispatch<SetStateAction<boolean>>;
  readonly name: string;
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
  const digitalTwinData = useSelector(selectDigitalTwinByName(name));
  const modifiedFiles = useSelector(selectModifiedFiles);
  const modifiedLibraryFiles = useSelector(selectModifiedLibraryFiles);
  const dispatch = useDispatch();

  const handleSave = () => setOpenSaveDialog(true);
  const handleCancel = () => setOpenCancelDialog(true);
  const handleCloseSaveDialog = () => setOpenSaveDialog(false);
  const handleCloseCancelDialog = () => setOpenCancelDialog(false);

  const handleConfirmSave = async () => {
    if (digitalTwinData) {
      const { saveChanges } = await import(
        'route/digitaltwins/manage/reconfigureDialogHandlers'
      );
      const digitalTwinInstance = await createDigitalTwinFromData(
        digitalTwinData,
        name,
      );
      await saveChanges(
        { modifiedFiles, modifiedLibraryFiles, name },
        digitalTwinInstance,
        dispatch,
      );
    }
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
  readonly showDialog: boolean;
  readonly setShowDialog: Dispatch<SetStateAction<boolean>>;
  readonly name: string;
  readonly handleCancel: () => void;
  readonly handleSave: () => void;
  readonly fileName: string;
  readonly setFileName: Dispatch<SetStateAction<string>>;
  readonly fileContent: string;
  readonly setFileContent: Dispatch<SetStateAction<string>>;
  readonly fileType: string;
  readonly setFileType: Dispatch<SetStateAction<string>>;
  readonly filePrivacy: string;
  readonly setFilePrivacy: Dispatch<SetStateAction<string>>;
  readonly isLibraryFile: boolean;
  readonly setIsLibraryFile: Dispatch<SetStateAction<boolean>>;
  readonly libraryAssetPath: string;
  readonly setLibraryAssetPath: Dispatch<SetStateAction<string>>;
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
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly content: string;
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
