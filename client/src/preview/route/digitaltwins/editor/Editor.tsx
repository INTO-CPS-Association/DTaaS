import * as React from 'react';
import { useState } from 'react';
import { Box, Grid, Tabs, Tab } from '@mui/material';
// import { Resizable } from 'react-resizable';
import EditorTab from './EditorTab';
import PreviewTab from './PreviewTab';
import Sidebar from './Sidebar';

interface EditorProps {
  DTName: string;
}

function Editor({ DTName }: EditorProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      <Sidebar
        name={DTName}
        setFileName={setFileName}
        setFileContent={setFileContent}
        setFileType={setFileType}
      />

      <Grid container direction="column" sx={{ flexGrow: 1, padding: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="editor preview tabs"
        >
          <Tab label="Editor" />
          <Tab label="Preview" />
        </Tabs>

        <Box
          sx={{
            flexGrow: 1,
            padding: 2,
            border: '1px solid lightgray',
            marginTop: 2,
            width: '800px',
          }}
        >
          {activeTab === 0 && (
            <EditorTab
              fileName={fileName}
              fileContent={fileContent}
              setFileContent={setFileContent}
            />
          )}
          {activeTab === 1 && (
            <PreviewTab fileContent={fileContent} fileType={fileType} />
          )}
        </Box>
      </Grid>
    </Box>
  );
}

export default Editor;
