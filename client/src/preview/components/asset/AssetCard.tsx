import * as React from 'react';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { AlertColor, CardActions, Grid } from '@mui/material';
import styled from '@emotion/styled';
import DigitalTwin, { formatName } from 'util/gitlabDigitalTwin';
import { GitlabInstance } from 'util/gitlab';
import { getAuthority } from 'util/envUtil';
import CustomSnackbar from 'preview/route/digitaltwins/Snackbar';
import { useDispatch, useSelector } from 'react-redux';
import {
  setDigitalTwin,
  selectDigitalTwinByName,
} from 'store/digitalTwin.slice';
import DeleteDialog from 'preview/route/digitaltwins/manage/DeleteDialog';
import DetailsDialog from 'preview/route/digitaltwins/manage/DetailsDialog';
import LogDialog from 'preview/route/digitaltwins/execute/LogDialog';
import ReconfigureDialog from 'preview/route/digitaltwins/manage/ReconfigureDialog';
import StartStopButton from './StartStopButton';
import LogButton from './LogButton';
import { Asset } from './Asset';
import DeleteButton from './DeleteButton';
import DetailsButton from './DetailsButton';
import ReconfigureButton from './ReconfigureButton';

interface AssetCardProps {
  asset: Asset;
  buttons?: React.ReactNode;
}

interface AssetCardManageProps {
  asset: Asset;
  buttons?: React.ReactNode;
  onDelete: () => void;
}

interface CardButtonsContainerManageProps {
  name: string;
  setShowDetails: Dispatch<SetStateAction<boolean>>;
  setShowReconfigure: Dispatch<SetStateAction<boolean>>;
  setShowDelete: Dispatch<SetStateAction<boolean>>;
}

interface CardButtonsContainerExecuteProps {
  assetName: string;
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

function CardButtonsContainerManage({
  name,
  setShowDetails,
  setShowReconfigure,
  setShowDelete,
}: CardButtonsContainerManageProps) {
  return (
    <CardActions style={{ justifyContent: 'flex-end' }}>
      <DetailsButton name={name} setShowLog={setShowDetails} />
      <ReconfigureButton setShowReconfigure={setShowReconfigure} />
      <DeleteButton setShowLog={setShowDelete} />
    </CardActions>
  );
}

function CardButtonsContainerExecute({
  assetName,
  setShowLog,
}: CardButtonsContainerExecuteProps) {
  const [logButtonDisabled, setLogButtonDisabled] = useState(true);
  return (
    <CardActions style={{ justifyContent: 'flex-end' }}>
      <StartStopButton
        assetName={assetName}
        setLogButtonDisabled={setLogButtonDisabled}
      />
      <LogButton
        setShowLog={setShowLog}
        logButtonDisabled={logButtonDisabled}
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

function AssetCardManage({ asset, onDelete }: AssetCardManageProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showReconfigure, setShowReconfigure] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const dispatch = useDispatch();
  const digitalTwin = useSelector(selectDigitalTwinByName(asset.name));

  useEffect(() => {
    const initialize = async () => {
      const gitlabInstance = new GitlabInstance(
        sessionStorage.getItem('username') || '',
        getAuthority(),
        sessionStorage.getItem('access_token') || '',
      );
      await gitlabInstance.init();
      dispatch(
        setDigitalTwin({
          assetName: asset.name,
          digitalTwin: new DigitalTwin(asset.name, gitlabInstance),
        }),
      );
    };

    initialize();
  }, [asset.name, dispatch]);

  return (
    digitalTwin && (
      <>
        <AssetCard
          asset={asset}
          buttons={
            <CardButtonsContainerManage
              name={asset.name}
              setShowDetails={setShowDetails}
              setShowReconfigure={setShowReconfigure}
              setShowDelete={setShowDelete}
            />
          }
        />
        <CustomSnackbar />
        <DetailsDialog
          showLog={showDetails}
          setShowLog={setShowDetails}
          name={asset.name}
        />
        <ReconfigureDialog
          showLog={showReconfigure}
          setShowLog={setShowReconfigure}
          name={asset.name}
        />
        <DeleteDialog
          showLog={showDelete}
          setShowLog={setShowDelete}
          name={asset.name}
          onDelete={onDelete}
        />
      </>
    )
  );
}

function AssetCardExecute({ asset }: AssetCardProps) {
  useState<AlertColor>('success');
  const [showLog, setShowLog] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    const initialize = async () => {
      const gitlabInstance = new GitlabInstance(
        sessionStorage.getItem('username') || '',
        getAuthority(),
        sessionStorage.getItem('access_token') || '',
      );
      await gitlabInstance.init();
      dispatch(
        setDigitalTwin({
          assetName: asset.name,
          digitalTwin: new DigitalTwin(asset.name, gitlabInstance),
        }),
      );
    };

    initialize();
  }, [asset.name, dispatch]);

  const digitalTwin = useSelector(selectDigitalTwinByName(asset.name));

  return (
    digitalTwin && (
      <>
        <AssetCard
          asset={asset}
          buttons={
            <CardButtonsContainerExecute
              assetName={asset.name}
              setShowLog={setShowLog}
            />
          }
        />
        <CustomSnackbar />
        <LogDialog
          showLog={showLog}
          setShowLog={setShowLog}
          name={asset.name}
        />
      </>
    )
  );
}

export {
  AssetCardManage,
  AssetCardExecute,
  CardButtonsContainerManage,
  CardButtonsContainerExecute,
};
