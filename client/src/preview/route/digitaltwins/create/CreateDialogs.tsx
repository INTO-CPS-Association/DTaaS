import * as React from 'react';
import ChangeFileNameDialog from './ChangeFileNameDialog';
import DeleteFileDialog from './DeleteFileDialog';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import CreateDTDialog from './CreateDTDialog';

interface CreateDialogsProps {
  openChangeFileNameDialog: boolean;
  onCloseChangeFileNameDialog: () => void;
  fileName: string;
  setFileName: (name: string) => void;
  setFileContent: (content: string) => void;
  setFileType: (type: string) => void;
  openDeleteFileDialog: boolean;
  onCloseDeleteFileDialog: () => void;
  openConfirmDeleteDialog: boolean;
  setOpenConfirmDeleteDialog: (open: boolean) => void;
  openInputDialog: boolean;
  setOpenInputDialog: (open: boolean) => void;
  newDigitalTwinName: string;
  setNewDigitalTwinName: (name: string) => void;
  errorMessage: string;
  setErrorMessage: (message: string) => void;
}

const CreateDialogs: React.FC<CreateDialogsProps> = (props) => (
  <>
    <ChangeFileNameDialog
      open={props.openChangeFileNameDialog}
      onClose={props.onCloseChangeFileNameDialog}
      fileName={props.fileName}
      setFileName={props.setFileName}
      setFileType={props.setFileType}
    />

    <DeleteFileDialog
      open={props.openDeleteFileDialog}
      onClose={props.onCloseDeleteFileDialog}
      fileName={props.fileName}
      setFileName={props.setFileName}
      setFileContent={props.setFileContent}
    />

    <CreateDTDialog
      open={props.openInputDialog}
      onClose={() => props.setOpenInputDialog(false)}
      newDigitalTwinName={props.newDigitalTwinName}
      setNewDigitalTwinName={props.setNewDigitalTwinName}
      errorMessage={props.errorMessage}
      setErrorMessage={props.setErrorMessage}
      setFileName={props.setFileName}
      setFileContent={props.setFileContent}
      setFileType={props.setFileType}
      setOpenInputDialog={props.setOpenInputDialog}
    />

    <ConfirmDeleteDialog
      open={props.openConfirmDeleteDialog}
      onClose={() => props.setOpenConfirmDeleteDialog(false)}
      setFileName={props.setFileName}
      setFileContent={props.setFileContent}
      setFileType={props.setFileType}
      setNewDigitalTwinName={props.setNewDigitalTwinName}
    />
  </>
);

export default CreateDialogs;
