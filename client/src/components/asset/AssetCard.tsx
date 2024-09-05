import * as React from 'react';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { AlertColor, CardActions, Grid } from '@mui/material';
import styled from '@emotion/styled';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { GitlabInstance } from 'util/gitlab';
import { getAuthority } from 'util/envUtil';
import CustomSnackbar from 'route/digitaltwins/Snackbar';
import LogDialog from 'route/digitaltwins/LogDialog';
import StartStopButton from './StartStopButton';
import LogButton from './LogButton';
import { Asset } from './Asset';

interface AssetCardProps {
  asset: Asset;
  buttons?: React.ReactNode;
}

interface AssetCardExecuteProps {
  asset: Asset;
}

interface CardButtonsContainerExecuteProps {
  digitalTwin: DigitalTwin;
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>;
  setSnackbarMessage: Dispatch<SetStateAction<string>>;
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>;
  executionCount: number;
  setExecutionCount: Dispatch<SetStateAction<number>>;
  setJobLogs: Dispatch<SetStateAction<{ jobName: string; log: string }[]>>;
  setShowLog: Dispatch<SetStateAction<boolean>>;
}

const Header = styled(Typography)`
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  white-space. nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Description = styled(Typography)`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
`;

const formatName = (name: string) =>
  name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());

function CardActionAreaContainer(asset: Asset) {
  return (
    <Grid container>
      <Grid item xs={12}>
        <CardContent
          sx={{
            padding: '5px 0px 0px 0px',
            ':last-child': { paddingBottom: 0 },
            maxHeight: '85px',
            overflowY: 'auto',
            width: '100%',
            justifyContent: 'flex-start',
          }}
        >
          <Description variant="body2" color="text.secondary">
            {asset.description}
          </Description>
        </CardContent>
      </Grid>
    </Grid>
  );
}

function CardButtonsContainerExecute({
  digitalTwin,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  executionCount,
  setExecutionCount,
  setJobLogs,
  setShowLog,
}: CardButtonsContainerExecuteProps) {
  const [pipelineCompleted, setPipelineCompleted] = useState(false);

  return (
    <CardActions style={{ justifyContent: 'flex-end' }}>
      <StartStopButton
        digitalTwin={digitalTwin}
        setSnackbarOpen={setSnackbarOpen}
        setSnackbarMessage={setSnackbarMessage}
        setSnackbarSeverity={setSnackbarSeverity}
        executionCount={executionCount}
        setExecutionCount={setExecutionCount}
        setJobLogs={setJobLogs}
        setPipelineCompleted={setPipelineCompleted}
      />
      <LogButton
        pipelineCompleted={pipelineCompleted}
        setShowLog={setShowLog}
      />
    </CardActions>
  );
}

function AssetCard({ asset, buttons }: AssetCardProps) {
  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 235,
        height: 170,
        justifyContent: 'space-between',
        padding: '5px 10px 5px 10px',
      }}
    >
      <Header variant="h6">{formatName(asset.name)}</Header>
      <CardActionAreaContainer {...asset} />
      {buttons}
    </Card>
  );
}

function AssetCardExecute({ asset }: AssetCardExecuteProps) {
  const [digitalTwin, setDigitalTwin] = useState<DigitalTwin>(
    new DigitalTwin('', new GitlabInstance('', '', '')),
  );
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] =
    useState<AlertColor>('success');
  const [showLog, setShowLog] = useState(false);
  const [executionCount, setExecutionCount] = useState(0);
  const [jobLogs, setJobLogs] = useState<{ jobName: string; log: string }[]>(
    [],
  );

  useEffect(() => {
    const gitlabInstance = new GitlabInstance(
      sessionStorage.getItem('username') || '',
      getAuthority(),
      sessionStorage.getItem('access_token') || '',
    );
    gitlabInstance.init();
    console.log(gitlabInstance);
    setDigitalTwin(new DigitalTwin(asset.name, gitlabInstance));
  }, []);

  return (
    <>
      <AssetCard
        asset={asset}
        buttons={
          <CardButtonsContainerExecute
            digitalTwin={digitalTwin}
            setSnackbarOpen={setSnackbarOpen}
            setSnackbarMessage={setSnackbarMessage}
            setSnackbarSeverity={setSnackbarSeverity}
            executionCount={executionCount}
            setExecutionCount={setExecutionCount}
            setJobLogs={setJobLogs}
            setShowLog={setShowLog}
          />
        }
      />
      <CustomSnackbar
        snackbarOpen={snackbarOpen}
        snackbarMessage={snackbarMessage}
        snackbarSeverity={snackbarSeverity}
        setSnackbarOpen={setSnackbarOpen}
      />
      <LogDialog
        showLog={showLog}
        setShowLog={setShowLog}
        name={digitalTwin.DTName}
        executionCount={executionCount}
        jobLogs={jobLogs}
      />
    </>
  );
}

export default AssetCardExecute;
