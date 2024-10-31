import { addNewFile, FileState } from 'preview/store/file.slice';
import DigitalTwin from 'preview/util/digitalTwin';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { TreeItem, TreeItemProps } from '@mui/x-tree-view/TreeItem';
import * as React from 'react';

export const fetchData = async (digitalTwin: DigitalTwin) => {
  await digitalTwin.getDescriptionFiles();
  await digitalTwin.getLifecycleFiles();
  await digitalTwin.getConfigFiles();
};

export const handleFileClick = (
  fileName: string,
  digitalTwin: DigitalTwin | null,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
) => {
  if (tab === 'create') {
    handleCreateFileClick(
      fileName,
      files,
      setFileName,
      setFileContent,
      setFileType,
    );
  } else if (tab === 'reconfigure') {
    handleReconfigureFileClick(
      fileName,
      digitalTwin,
      files,
      setFileName,
      setFileContent,
      setFileType,
    );
  }
};

export const renderFileTreeItems = (
  label: string,
  filesToRender: string[],
  digitalTwin: DigitalTwin,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
) => (
  <TreeItem
    itemId={`${label.toLowerCase()}-${label}`}
    label={label as TreeItemProps['label']}
  >
    {filesToRender.map((item) => (
      <TreeItem
        key={item}
        itemId={`${label.toLowerCase()}-${item}`}
        label={item}
        onClick={() =>
          handleFileClick(
            item,
            digitalTwin!,
            setFileName,
            setFileContent,
            setFileType,
            files,
            tab,
          )
        }
      />
    ))}
  </TreeItem>
);

export const getFilteredFileNames = (type: string, files: FileState[]) =>
  files
    .filter((file) => file.type === type && file.isNew)
    .map((file) => file.name);

export const renderFileSection = (
  label: string,
  type: string,
  filesToRender: string[],
  digitalTwin: DigitalTwin,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
) => (
  <TreeItem itemId={`${label.toLowerCase()}-${label}`} label={label}>
    {filesToRender.map((item) => (
      <TreeItem
        key={item}
        itemId={`${label.toLowerCase()}-${item}`}
        label={item}
        onClick={() =>
          handleFileClick(
            item,
            digitalTwin!,
            setFileName,
            setFileContent,
            setFileType,
            files,
            tab,
          )
        }
      />
    ))}
  </TreeItem>
);

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

export const handleCloseFileNameDialog = (
  setIsFileNameDialogOpen: Dispatch<SetStateAction<boolean>>,
  setNewFileName: Dispatch<SetStateAction<string>>,
  setErrorMessage: Dispatch<SetStateAction<string>>,
) => {
  setIsFileNameDialogOpen(false);
  setNewFileName('');
  setErrorMessage('');
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

  if (newFileName === '') {
    setErrorMessage("File name can't be empty.");
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
