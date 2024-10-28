import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import ChangeFileNameDialog from './ChangeFileNameDialog';
import DeleteFileDialog from './DeleteFileDialog';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import CreateDTDialog from './CreateDTDialog';

interface CreateDialogsProps {
  openChangeFileNameDialog: boolean;
  onCloseChangeFileNameDialog: () => void;
  fileName: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  openDeleteFileDialog: boolean;
  onCloseDeleteFileDialog: () => void;
  openConfirmDeleteDialog: boolean;
  setOpenConfirmDeleteDialog: Dispatch<SetStateAction<boolean>>;
  openCreateDTDialog: boolean;
  setOpenCreateDTDialog: Dispatch<SetStateAction<boolean>>;
  newDigitalTwinName: string;
  setNewDigitalTwinName: Dispatch<SetStateAction<string>>;
  errorMessage: string;
  setErrorMessage: Dispatch<SetStateAction<string>>;
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
      open={props.openCreateDTDialog}
      onClose={() => props.setOpenCreateDTDialog(false)}
      newDigitalTwinName={props.newDigitalTwinName}
      setNewDigitalTwinName={props.setNewDigitalTwinName}
      errorMessage={props.errorMessage}
      setErrorMessage={props.setErrorMessage}
      setFileName={props.setFileName}
      setFileContent={props.setFileContent}
      setFileType={props.setFileType}
      setOpenCreateDTDialog={props.setOpenCreateDTDialog}
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
