import * as React from 'react';
import { useState } from 'react';
import { Box, Grid, Tabs, Tab } from '@mui/material';
import EditorTab from './EditorTab';
import PreviewTab from './PreviewTab';
import Sidebar from './Sidebar';
import CreateDialogs from '../create/CreateDialogs';

interface EditorProps {
  DTName?: string;
  tab: string;
  fileName: string;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  fileContent: string;
  setFileContent: React.Dispatch<React.SetStateAction<string>>;
  fileType: string;
  setFileType: React.Dispatch<React.SetStateAction<string>>;
  isLibraryFile: boolean;
  setIsLibraryFile: React.Dispatch<React.SetStateAction<boolean>>;
  libraryAssetPath: string;
  setLibraryAssetPath: React.Dispatch<React.SetStateAction<string>>;
}

function Editor({
  DTName,
  tab,
  fileName,
  setFileName,
  fileContent,
  setFileContent,
  fileType,
  setFileType,
  isLibraryFile,
  setIsLibraryFile,
  libraryAssetPath,
  setLibraryAssetPath,
}: EditorProps) {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const confirmCancel = () => {
    setOpenConfirmDeleteDialog(true);
  };

  const handleCancelConfirmation = () => {
    setOpenConfirmDeleteDialog(false);
    // Ulteriore logica per la cancellazione dei file se necessario
  };

  const handleConfirmCancel = () => {
    setFileName('');
    setFileContent('');
    setFileType('');
    dispatch(removeAllCreationFiles());
    setOpenConfirmDeleteDialog(false);
  };

  const confirmSave = () => {
    setOpenInputDialog(true);
  };

  const handleInputDialogClose = () => {
    setOpenInputDialog(false);
    setNewDigitalTwinName(''); // Reset dell'input
  };

  const handleInputDialogConfirm = async () => {
    const gitlabInstance = new GitlabInstance(
      sessionStorage.getItem('username') || '',
      getAuthority(),
      sessionStorage.getItem('access_token') || '',
    );
    await gitlabInstance.init();
    // Logica per salvare il Digital Twin con il nome newDigitalTwinName
    // console.log('Saving Digital Twin:', newDigitalTwinName);
    const digitalTwin = new DigitalTwin(newDigitalTwinName, gitlabInstance);
    await digitalTwin.createDT(files);
    handleInputDialogClose();
  };

  const isFileModifiable = () =>
    !['README.md', 'description.md', '.gitlab-ci.yml'].includes(fileName);

  const isFileDelatable = () =>
    !['.gitlab-ci.yml'].includes(fileName);

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        width: '100%',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
        <Sidebar
          name={DTName}
          setFileName={setFileName}
          setFileContent={setFileContent}
          setFileType={setFileType}
          setIsLibraryFile={setIsLibraryFile}
          setLibraryAssetPath={setLibraryAssetPath}
          tab={tab}
        />

        <Grid container direction="column" sx={{ flexGrow: 1, padding: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="editor preview tabs"
            >
              <Tab label="Editor" />
              <Tab label="Preview" />
            </Tabs>
          </Box>

          <Box
            sx={{
              flexGrow: 1,
              padding: 2,
              border: '1px solid lightgray',
              marginTop: 2,
              width: '800px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {activeTab === 0 && (
              <EditorTab
                tab={tab}
                fileName={fileName}
                fileContent={fileContent}
                setFileContent={setFileContent}
                isLibraryFile={isLibraryFile}
                libraryAssetPath={libraryAssetPath}
              />
            )}
            {activeTab === 1 && (
              <PreviewTab fileContent={fileContent} fileType={fileType} />
            )}
          </Box>
        </Grid>
      </Box>
    </Box>
  );
}

export default Editor;
