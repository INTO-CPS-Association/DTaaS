import React, { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { Grid, Typography, CircularProgress } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { FileState } from '../../../store/file.slice';
import { selectDigitalTwinByName } from '../../../store/digitalTwin.slice';
import DigitalTwin from '../../../util/gitlabDigitalTwin';

interface SidebarProps {
  name: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
}

const fetchData = async (digitalTwin: DigitalTwin) => {
  await digitalTwin.getDescriptionFiles();
  await digitalTwin.getLifecycleFiles();
  await digitalTwin.getConfigFiles();
};

const handleFileClick = async (
  fileName: string,
  digitalTwin: DigitalTwin,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  modifiedFiles: FileState[],
) => {
  const modifiedFile = modifiedFiles.find((file) => file.name === fileName);

  if (modifiedFile) {
    setFileName(modifiedFile.name);
    setFileContent(modifiedFile.content);
    setFileType(modifiedFile.name.split('.').pop() || '');
  } else {
    const fileContent = await digitalTwin.getFileContent(fileName);
    if (fileContent) {
      setFileName(fileName);
      setFileContent(fileContent);
      setFileType(fileName.split('.').pop() || '');
    } else {
      setFileContent(`Error fetching ${fileName} content`);
    }
  }
};

const Sidebar = ({
  name,
  setFileName,
  setFileContent,
  setFileType,
}: SidebarProps) => {
  const digitalTwin = useSelector(selectDigitalTwinByName(name));
  const modifiedFiles = useSelector((state: RootState) => state.files);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await fetchData(digitalTwin);
      setIsLoading(false);
    };

    loadData();
  }, [digitalTwin]);

  if (isLoading) {
    return (
      <Grid
        container
        direction="column"
        justifyContent="center"
        alignItems="center"
        sx={{
          padding: 2,
          height: '100%',
          maxWidth: '300px',
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          overflowY: 'auto',
        }}
      >
        <CircularProgress />
      </Grid>
    );
  }  

  return (
    <Grid
      container
      direction="column"
      sx={{
        padding: 2,
        height: '100%',
        maxWidth: '300px',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        overflowY: 'auto',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Description
      </Typography>
      <SimpleTreeView>
        {digitalTwin.descriptionFiles.map((item, id) => (
          <TreeItem
            key={id}
            itemId={item}
            label={item}
            onClick={() =>
              handleFileClick(
                item,
                digitalTwin,
                setFileName,
                setFileContent,
                setFileType,
                modifiedFiles,
              )
            }
          />
        ))}
      </SimpleTreeView>

      <Typography variant="h6" gutterBottom>
        Lifecycle
      </Typography>
      <SimpleTreeView>
        {digitalTwin.lifecycleFiles.map((item, id) => (
          <TreeItem
            key={id}
            itemId={item}
            label={item}
            onClick={() =>
              handleFileClick(
                item,
                digitalTwin,
                setFileName,
                setFileContent,
                setFileType,
                modifiedFiles,
              )
            }
          />
        ))}
      </SimpleTreeView>

      <Typography variant="h6" gutterBottom sx={{ marginTop: 2 }}>
        Config
      </Typography>
      <SimpleTreeView>
        {digitalTwin.configFiles.map((item, id) => (
          <TreeItem
            key={id}
            itemId={item}
            label={item}
            onClick={() =>
              handleFileClick(
                item,
                digitalTwin,
                setFileName,
                setFileContent,
                setFileType,
                modifiedFiles,
              )
            }
          >
            {item.startsWith('Service') && (
              <TreeItem
                itemId={`${id}-service`}
                label={`More info for ${item}`}
              />
            )}
          </TreeItem>
        ))}
      </SimpleTreeView>
    </Grid>
  );
};

export default Sidebar;
