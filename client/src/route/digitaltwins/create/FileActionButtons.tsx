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
      <Tooltip
        title={
          deleteFileDisabled
            ? 'This operation is not allowed for this file'
            : ''
        }
      >
        <span>
          <Button
            variant="contained"
            onClick={() => setOpenDeleteFileDialog(true)}
            disabled={deleteFileDisabled}
          >
            Delete File
          </Button>
        </span>
      </Tooltip>
      <Tooltip
        title={
          changeFileNameDisabled
            ? 'This operation is not allowed for this file'
            : ''
        }
      >
        <span>
          <Button
            variant="contained"
            onClick={() => setOpenChangeFileNameDialog(true)}
            disabled={changeFileNameDisabled}
          >
            Rename File
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
}

export default FileActionButtons;
