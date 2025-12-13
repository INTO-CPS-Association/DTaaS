import { Dispatch, SetStateAction } from 'react';
import ChangeFileNameDialog from 'preview/route/digitaltwins/create/ChangeFileNameDialog';
import DeleteFileDialog from 'preview/route/digitaltwins/create/DeleteFileDialog';
import ConfirmDeleteDialog from 'preview/route/digitaltwins/create/ConfirmDeleteDialog';
import CreateDTDialog from 'preview/route/digitaltwins/create/CreateDTDialog';

interface CreateDialogsProps {
  openChangeFileNameDialog: boolean;
  setOpenChangeFileNameDialog: Dispatch<SetStateAction<boolean>>;
  fileName: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  openDeleteFileDialog: boolean;
  setOpenDeleteFileDialog: Dispatch<SetStateAction<boolean>>;
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
      setOpenChangeFileNameDialog={props.setOpenChangeFileNameDialog}
      fileName={props.fileName}
      setFileName={props.setFileName}
      setFileType={props.setFileType}
    />

    <DeleteFileDialog
      open={props.openDeleteFileDialog}
      setOpenDeleteFileDialog={props.setOpenDeleteFileDialog}
      fileName={props.fileName}
      setFileName={props.setFileName}
      setFileContent={props.setFileContent}
    />

    <CreateDTDialog
      open={props.openCreateDTDialog}
      setOpenCreateDTDialog={props.setOpenCreateDTDialog}
      newDigitalTwinName={props.newDigitalTwinName}
      setNewDigitalTwinName={props.setNewDigitalTwinName}
      errorMessage={props.errorMessage}
      setErrorMessage={props.setErrorMessage}
      setFileName={props.setFileName}
      setFileContent={props.setFileContent}
      setFileType={props.setFileType}
    />

    <ConfirmDeleteDialog
      open={props.openConfirmDeleteDialog}
      setOpenConfirmDeleteDialog={props.setOpenConfirmDeleteDialog}
      setFileName={props.setFileName}
      setFileContent={props.setFileContent}
      setFileType={props.setFileType}
      setNewDigitalTwinName={props.setNewDigitalTwinName}
    />
  </>
);

export default CreateDialogs;
