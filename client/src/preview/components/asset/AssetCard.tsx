import * as React from 'react';
import { useState, Dispatch, SetStateAction } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { AlertColor, CardActions, Grid } from '@mui/material';
import styled from '@emotion/styled';
import { formatName } from 'preview/util/gitlabDigitalTwin';
import CustomSnackbar from 'preview/route/digitaltwins/Snackbar';
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from 'preview/store/digitalTwin.slice';
import { RootState } from 'store/store';
import LogDialog from 'preview/route/digitaltwins/execute/LogDialog';
import DetailsDialog from 'preview/route/digitaltwins/manage/DetailsDialog';
import ReconfigureDialog from 'preview/route/digitaltwins/manage/ReconfigureDialog';
import DeleteDialog from 'preview/route/digitaltwins/manage/DeleteDialog';
import StartStopButton from './StartStopButton';
import LogButton from './LogButton';
import { Asset } from './Asset';
import DetailsButton from './DetailsButton';
import ReconfigureButton from './ReconfigureButton';
import DeleteButton from './DeleteButton';

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
  assetName: string;
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
  const digitalTwin = useSelector(
    (state: RootState) => state.digitalTwin[asset.name],
  );

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
            {digitalTwin.description}
          </Description>
        </CardContent>
      </Grid>
    </Grid>
  );
}

function CardButtonsContainerManage({
  assetName,
  setShowDetails,
  setShowReconfigure,
  setShowDelete,
}: CardButtonsContainerManageProps) {
  return (
    <CardActions style={{ justifyContent: 'flex-end' }}>
      <DetailsButton assetName={assetName} setShowLog={setShowDetails} />
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
  const [showDetailsLog, setShowDetailsLog] = useState(false);
  const [showDeleteLog, setShowDeleteLog] = useState(false);
  const [showReconfigure, setShowReconfigure] = useState(false);
  const digitalTwin = useSelector(selectDigitalTwinByName(asset.name));

  return (
    digitalTwin && (
      <>
        <AssetCard
          asset={asset}
          buttons={
            <CardButtonsContainerManage
              assetName={asset.name}
              setShowDelete={setShowDeleteLog}
              setShowDetails={setShowDetailsLog}
              setShowReconfigure={setShowReconfigure}
            />
          }
        />
        <CustomSnackbar />
        <DetailsDialog
          showLog={showDetailsLog}
          setShowLog={setShowDetailsLog}
          name={asset.name}
        />
        <ReconfigureDialog
          showLog={showReconfigure}
          setShowLog={setShowReconfigure}
          name={asset.name}
        />
        <DeleteDialog
          showLog={showDeleteLog}
          setShowLog={setShowDeleteLog}
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

export { AssetCardManage, AssetCardExecute };
