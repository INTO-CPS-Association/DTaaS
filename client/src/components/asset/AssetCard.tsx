import { useState, Dispatch, SetStateAction } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { CardActions, Grid } from '@mui/material';
import styled from '@emotion/styled';
import { formatName } from 'model/backend/digitalTwin';
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';
import { RootState } from 'store/store';
import LogDialog from 'components/LogDialog';
import DetailsDialog from 'route/digitaltwins/manage/DetailsDialog';
import { selectAssetByPathAndPrivacy } from 'model/store/assets.slice';
import HistoryButton from 'components/asset/HistoryButton';
import StartButton from 'components/asset/StartButton';
import { Asset } from 'model/backend/Asset';
import AddToCartButton from 'components/asset/AddToCartButton';
import DetailsButton from 'components/asset/DetailsButton';

interface AssetCardProps {
  readonly asset: Asset;
  readonly buttons?: React.ReactNode;
  readonly library?: boolean;
}

interface CardButtonsContainerExecuteProps {
  readonly assetName: string;
  readonly setShowLog: Dispatch<SetStateAction<boolean>>;
}

interface CardButtonsContainerLibraryProps {
  readonly assetName: string;
  readonly assetPath: string;
  readonly assetPrivacy: boolean;
  readonly setShowDetails: Dispatch<SetStateAction<boolean>>;
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

function CardActionAreaContainer({
  library,
  ...asset
}: Asset & { readonly library?: boolean }) {
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
            {selectedAsset?.description}
          </Description>
        </CardContent>
      </Grid>
    </Grid>
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

export function AssetCard({ asset, buttons, library }: AssetCardProps) {
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

function AssetCardExecute({ asset }: Readonly<{ asset: Asset }>) {
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

function AssetCardLibrary({ asset }: Readonly<{ asset: Asset }>) {
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

export { AssetCardExecute, AssetCardLibrary };
