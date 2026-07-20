import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { isFileDeletable, isFileModifiable } from 'util/fileUtils';
import { Tooltip } from '@mui/material';

interface FileActionButtonsProps {
  readonly fileName: string;
  readonly setOpenDeleteFileDialog: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  readonly setOpenChangeFileNameDialog: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  readonly isLibraryFile: boolean;
}

interface FileActionButtonProps {
  readonly action: string;
  readonly disabled: boolean;
  readonly fileName: string;
  readonly label: string;
  readonly onClick: () => void;
}

function FileActionButton({
  action,
  disabled,
  fileName,
  label,
  onClick,
}: FileActionButtonProps) {
  const disabledMessage = 'This operation is not allowed for this file';
  return (
    <Tooltip title={disabled ? disabledMessage : ''}>
      <span>
        <Button
          variant="contained"
          onClick={onClick}
          disabled={disabled}
          data-logger-element="button"
          data-logger-label={label}
          data-logger-context={JSON.stringify({
            file: { name: fileName, button: action },
          })}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );
}

function FileActionButtons({
  fileName,
  setOpenDeleteFileDialog,
  setOpenChangeFileNameDialog,
  isLibraryFile,
}: FileActionButtonsProps) {
  const deleteFileDisabled = !(
    isFileDeletable(fileName) &&
    fileName &&
    !isLibraryFile
  );
  const changeFileNameDisabled = !(
    isFileModifiable(fileName) &&
    fileName &&
    !isLibraryFile
  );

  return (
    <Box
      sx={{ display: 'flex', gap: 1, justifyContent: 'center', marginTop: 2 }}
    >
      <FileActionButton
        action="delete"
        disabled={deleteFileDisabled}
        fileName={fileName}
        label="Delete File"
        onClick={() => setOpenDeleteFileDialog(true)}
      />
      <FileActionButton
        action="rename"
        disabled={changeFileNameDisabled}
        fileName={fileName}
        label="Rename File"
        onClick={() => setOpenChangeFileNameDialog(true)}
      />
    </Box>
  );
}

export default FileActionButtons;
