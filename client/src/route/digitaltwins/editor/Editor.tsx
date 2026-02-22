import { useState } from 'react';
import { Box, Grid, Tabs, Tab } from '@mui/material';
import EditorTab from 'route/digitaltwins/editor/EditorTab';
import PreviewTab from 'route/digitaltwins/editor/PreviewTab';
import Sidebar from 'route/digitaltwins/editor/Sidebar';

interface EditorProps {
  readonly DTName?: string;
  readonly tab: string;
  readonly fileName: string;
  readonly setFileName: React.Dispatch<React.SetStateAction<string>>;
  readonly fileContent: string;
  readonly setFileContent: React.Dispatch<React.SetStateAction<string>>;
  readonly fileType: string;
  readonly setFileType: React.Dispatch<React.SetStateAction<string>>;
  readonly filePrivacy: string;
  readonly setFilePrivacy: React.Dispatch<React.SetStateAction<string>>;
  readonly isLibraryFile: boolean;
  readonly setIsLibraryFile: React.Dispatch<React.SetStateAction<boolean>>;
  readonly libraryAssetPath: string;
  readonly setLibraryAssetPath: React.Dispatch<React.SetStateAction<string>>;
  readonly setOpenDeleteFileDialog?: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  readonly setOpenChangeFileNameDialog?: React.Dispatch<
    React.SetStateAction<boolean>
  >;
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
  filePrivacy,
  setFilePrivacy,
  isLibraryFile,
  setIsLibraryFile,
  libraryAssetPath,
  setLibraryAssetPath,
  setOpenDeleteFileDialog,
  setOpenChangeFileNameDialog,
}: EditorProps) {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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
          setFilePrivacy={setFilePrivacy}
          setIsLibraryFile={setIsLibraryFile}
          setLibraryAssetPath={setLibraryAssetPath}
          tab={tab}
          fileName={fileName}
          isLibraryFile={isLibraryFile}
          setOpenDeleteFileDialog={setOpenDeleteFileDialog || undefined}
          setOpenChangeFileNameDialog={setOpenChangeFileNameDialog || undefined}
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
                filePrivacy={filePrivacy}
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
