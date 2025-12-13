import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { isFileDeletable, isFileModifiable } from 'preview/util/fileUtils';
import { Tooltip } from '@mui/material';

function FileActionButtons({
  fileName,
  setOpenDeleteFileDialog,
  setOpenChangeFileNameDialog,
  isLibraryFile,
}: {
  fileName: string;
  setOpenDeleteFileDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenChangeFileNameDialog: React.Dispatch<React.SetStateAction<boolean>>;
  isLibraryFile: boolean;
}) {
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
