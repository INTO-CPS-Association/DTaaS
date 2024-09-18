import * as React from 'react';
import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Grid, Typography } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { FileState } from 'store/file.slice';
import { selectDigitalTwinByName } from 'store/digitalTwin.slice';

interface DataItem {
  id: string;
  name: string;
}

interface SidebarProps {
  name: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
}

const fetchData = async (
  digitalTwin: DigitalTwin,
  setDescriptionData: Dispatch<SetStateAction<DataItem[]>>,
  setConfigData: Dispatch<SetStateAction<DataItem[]>>,
) => {
  await digitalTwin.getDescriptionFiles();
  await digitalTwin.getConfigFiles();
  setDescriptionData(
    digitalTwin.descriptionFiles.map((name) => ({ id: name, name })),
  );
  setConfigData(digitalTwin.configFiles.map((name) => ({ id: name, name })));
};

const handleFileClick = async (
  fileName: string,
  digitalTwin: DigitalTwin,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  dispatch: ReturnType<typeof useDispatch>,
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
  const [descriptionData, setDescriptionData] = useState<DataItem[]>([]);
  const [configData, setConfigData] = useState<DataItem[]>([]);
  const digitalTwin = useSelector(selectDigitalTwinByName(name));
  const modifiedFiles = useSelector((state: RootState) => state.files);
  const dispatch = useDispatch();

  useEffect(() => {
    fetchData(digitalTwin, setDescriptionData, setConfigData);
  }, [digitalTwin]);

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
        {descriptionData.map((item) => (
          <TreeItem
            key={item.id}
            itemId={item.id}
            label={item.name}
            onClick={() =>
              handleFileClick(
                item.name,
                digitalTwin,
                setFileName,
                setFileContent,
                setFileType,
                dispatch,
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
        {configData.map((item) => (
          <TreeItem
            key={item.id}
            itemId={item.id}
            label={item.name}
            onClick={() =>
              handleFileClick(
                item.name,
                digitalTwin,
                setFileName,
                setFileContent,
                setFileType,
                dispatch,
                modifiedFiles,
              )
            }
          >
            {item.name.startsWith('Service') && (
              <TreeItem
                itemId={`${item.id}-service`}
                label={`More info for ${item.name}`}
              />
            )}
          </TreeItem>
        ))}
      </SimpleTreeView>
    </Grid>
  );
};

export default Sidebar;
