import { useState, Dispatch, SetStateAction } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { AlertColor, CardActions, Grid } from '@mui/material';
import styled from '@emotion/styled';
import { formatName } from 'model/backend/digitalTwin';
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';
import { RootState } from 'store/store';
import LogDialog from 'components/LogDialog';
import DetailsDialog from 'preview/route/digitaltwins/manage/DetailsDialog';
import ReconfigureDialog from 'preview/route/digitaltwins/manage/ReconfigureDialog';
import DeleteDialog from 'preview/route/digitaltwins/manage/DeleteDialog';
import { selectAssetByPathAndPrivacy } from 'preview/store/assets.slice';
import HistoryButton from 'components/asset/HistoryButton';
import StartButton from 'preview/components/asset/StartButton';
import { Asset } from 'model/backend/Asset';
import ReconfigureButton from 'preview/components/asset/ReconfigureButton';
import DeleteButton from 'preview/components/asset/DeleteButton';
import AddToCartButton from 'preview/components/asset/AddToCartButton';
import DetailsButton from 'preview/components/asset/DetailsButton';

interface AssetCardProps {
  asset: Asset;
  buttons?: React.ReactNode;
  library?: boolean;
}

interface AssetCardManageProps {
  asset: Asset;
  buttons?: React.ReactNode;
  onDelete: () => void;
}

interface CardButtonsContainerManageProps {
  assetName: string;
  assetPrivacy: boolean;
  setShowDetails: Dispatch<SetStateAction<boolean>>;
  setShowReconfigure: Dispatch<SetStateAction<boolean>>;
  setShowDelete: Dispatch<SetStateAction<boolean>>;
}

interface CardButtonsContainerExecuteProps {
  assetName: string;
  setShowLog: Dispatch<SetStateAction<boolean>>;
}

interface CardButtonsContainerLibraryProps {
  assetName: string;
  assetPath: string;
  assetPrivacy: boolean;
  setShowDetails: Dispatch<SetStateAction<boolean>>;
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

function CardActionAreaContainer(asset: Asset, library?: boolean) {
  const digitalTwin = useSelector(
    (state: RootState) => state.digitalTwin.digitalTwin[asset.name],
  );

  const libraryAsset = useSelector(
    selectAssetByPathAndPrivacy(asset.path, asset.isPrivate),
  );

  const selectedAsset = library ? libraryAsset : digitalTwin;

  return (
    <Grid container>
      <Grid size={{ xs: 12 }}>
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
            {selectedAsset!.description}
          </Description>
        </CardContent>
      </Grid>
    </Grid>
  );
}

function CardButtonsContainerManage({
  assetName,
  assetPrivacy,
  setShowDetails,
  setShowReconfigure,
  setShowDelete,
}: CardButtonsContainerManageProps) {
  return (
    <CardActions style={{ justifyContent: 'flex-end' }}>
      <DetailsButton
        assetName={assetName}
        setShowDetails={setShowDetails}
        assetPrivacy={assetPrivacy}
      />
      <ReconfigureButton setShowReconfigure={setShowReconfigure} />
      <DeleteButton setShowDelete={setShowDelete} />
    </CardActions>
  );
}

function CardButtonsContainerExecute({
  assetName,
  setShowLog,
}: CardButtonsContainerExecuteProps) {
  const [historyButtonDisabled, setHistoryButtonDisabled] = useState(false);
  return (
    <CardActions style={{ justifyContent: 'flex-end' }}>
      <StartButton
        assetName={assetName}
        setHistoryButtonDisabled={setHistoryButtonDisabled}
      />
      <HistoryButton
        setShowLog={setShowLog}
        historyButtonDisabled={historyButtonDisabled}
        assetName={assetName}
      />
    </CardActions>
  );
}

function CardButtonsContainerLibrary({
  assetName,
  assetPath,
  assetPrivacy,
  setShowDetails,
}: CardButtonsContainerLibraryProps) {
  return (
    <CardActions style={{ justifyContent: 'flex-end' }}>
      <DetailsButton
        assetName={assetName}
        assetPrivacy={assetPrivacy}
        setShowDetails={setShowDetails}
        library={true}
        assetPath={assetPath}
      />
      <AddToCartButton assetPath={assetPath} assetPrivacy={assetPrivacy} />
    </CardActions>
  );
}

function AssetCard({ asset, buttons, library }: AssetCardProps) {
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
      <CardActionAreaContainer {...{ ...asset, library }} />
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
              assetPrivacy={asset.isPrivate}
              setShowDelete={setShowDeleteLog}
              setShowDetails={setShowDetailsLog}
              setShowReconfigure={setShowReconfigure}
            />
          }
        />
        <DetailsDialog
          showDialog={showDetailsLog}
          setShowDialog={setShowDetailsLog}
          name={asset.name}
          isPrivate={asset.isPrivate}
        />
        <ReconfigureDialog
          showDialog={showReconfigure}
          setShowDialog={setShowReconfigure}
          name={asset.name}
        />
        <DeleteDialog
          showDialog={showDeleteLog}
          setShowDialog={setShowDeleteLog}
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
        <LogDialog
          showLog={showLog}
          setShowLog={setShowLog}
          name={asset.name}
        />
      </>
    )
  );
}

function AssetCardLibrary({ asset }: AssetCardProps) {
  useState<AlertColor>('success');
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <AssetCard
        asset={asset}
        buttons={
          <CardButtonsContainerLibrary
            assetName={asset.name}
            assetPath={asset.path}
            assetPrivacy={asset.isPrivate}
            setShowDetails={setShowDetails}
          />
        }
        library={true}
      />
      <DetailsDialog
        showDialog={showDetails}
        setShowDialog={setShowDetails}
        name={asset.name}
        library={true}
        path={asset.path}
        isPrivate={asset.isPrivate}
      />
    </>
  );
}

export { AssetCardManage, AssetCardExecute, AssetCardLibrary };
