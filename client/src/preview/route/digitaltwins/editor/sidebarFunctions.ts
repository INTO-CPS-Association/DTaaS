import { addNewFile, FileState } from 'preview/store/file.slice';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';

export const handleCreateFileClick = (
  fileName: string,
  files: FileState[],
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
) => {
  const newFile = files.find((file) => file.name === fileName && file.isNew);
  if (newFile) {
    updateFileState(
      newFile.name,
      newFile.content,
      setFileName,
      setFileContent,
      setFileType,
    );
  }
};

export const handleReconfigureFileClick = (
  fileName: string,
  digitalTwin: DigitalTwin | null,
  files: FileState[],
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
) => {
  const modifiedFile = files.find(
    (file) => file.name === fileName && file.isModified && !file.isNew,
  );
  if (modifiedFile) {
    updateFileState(
      modifiedFile.name,
      modifiedFile.content,
      setFileName,
      setFileContent,
      setFileType,
    );
  } else {
    fetchAndSetFileContent(
      fileName,
      digitalTwin,
      setFileName,
      setFileContent,
      setFileType,
    );
  }
};

export const fetchAndSetFileContent = async (
  fileName: string,
  digitalTwin: DigitalTwin | null,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
) => {
  try {
    const fileContent = await digitalTwin!.getFileContent(fileName);
    if (fileContent) {
      updateFileState(
        fileName,
        fileContent,
        setFileName,
        setFileContent,
        setFileType,
      );
    }
  } catch {
    setFileContent(`Error fetching ${fileName} content`);
  }
};

export const updateFileState = (
  fileName: string,
  fileContent: string,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
) => {
  setFileName(fileName);
  setFileContent(fileContent);
  setFileType(fileName.split('.').pop()!);
};

export const handleAddFileClick = (
  setIsFileNameDialogOpen: Dispatch<SetStateAction<boolean>>,
) => {
  setIsFileNameDialogOpen(true);
};

export const handleFileSubmit = (
  files: FileState[],
  newFileName: string,
  setErrorMessage: Dispatch<SetStateAction<string>>,
  dispatch: ReturnType<typeof useDispatch>,
  setIsFileNameDialogOpen: Dispatch<SetStateAction<boolean>>,
  setNewFileName: Dispatch<SetStateAction<string>>,
) => {
  const fileExtension = newFileName.split('.').pop()?.toLowerCase();

  const fileExists = files.some(
    (fileStore: { name: string }) => fileStore.name === newFileName,
  );

  if (fileExists) {
    setErrorMessage('A file with this name already exists.');
    return;
  }

  setErrorMessage('');
  let type;

  if (fileExtension === 'md') {
    type = 'description';
  } else if (
    fileExtension === 'json' ||
    fileExtension === 'yaml' ||
    fileExtension === 'yml'
  ) {
    type = 'config';
  } else {
    type = 'lifecycle';
  }

  dispatch(addNewFile({ name: newFileName, type }));

  setIsFileNameDialogOpen(false);
  setNewFileName('');
};
