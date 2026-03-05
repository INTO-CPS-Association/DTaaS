import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectAssetByPathAndPrivacy } from 'model/store/assets.slice';
import LibraryAsset from 'model/backend/libraryAsset';
import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';
import { getAuthority } from 'util/envUtil';
import { DigitalTwinData } from 'model/backend/state/digitalTwin.slice';

interface DetailsButtonProps {
  readonly assetName: string;
  readonly assetPrivacy: boolean;
  readonly setShowDetails: Dispatch<SetStateAction<boolean>>;
  readonly library?: boolean;
  readonly assetPath?: string;
}

// Handle library asset details display
const handleLibraryAssetClick = async (
  asset: LibraryAsset,
  setShowDetails: Dispatch<SetStateAction<boolean>>,
) => {
  await asset.getFullDescription(getAuthority());
  setShowDetails(true);
};

// Handle digital twin details display
const handleDigitalTwinClick = async (
  digitalTwinData: DigitalTwinData,
  assetName: string,
  setShowDetails: Dispatch<SetStateAction<boolean>>,
) => {
  if (!('DTName' in digitalTwinData)) return;

  const digitalTwinInstance = await createDigitalTwinFromData(
    digitalTwinData,
    assetName,
  );
  await digitalTwinInstance.getFullDescription();
  setShowDetails(true);
};

const getAssetClickHandler = (
  asset: LibraryAsset | DigitalTwinData,
  assetName: string,
  library: boolean | undefined,
  setShowDetails: Dispatch<SetStateAction<boolean>>,
): (() => Promise<void>) => {
  if (library) {
    return () => handleLibraryAssetClick(asset as LibraryAsset, setShowDetails);
  }
  return () =>
    handleDigitalTwinClick(asset as DigitalTwinData, assetName, setShowDetails);
};

const handleClick = async (
  asset: LibraryAsset | DigitalTwinData | undefined,
  assetName: string,
  library: boolean | undefined,
  setShowDetails: Dispatch<SetStateAction<boolean>>,
) => {
  if (!asset) return;
  await getAssetClickHandler(asset, assetName, library, setShowDetails)();
};

function DetailsButton({
  assetName,
  assetPrivacy,
  setShowDetails,
  library,
  assetPath,
}: DetailsButtonProps) {
  const digitalTwin = useSelector(selectDigitalTwinByName(assetName));
  const libraryAsset = useSelector(
    selectAssetByPathAndPrivacy(assetPath ?? '', assetPrivacy),
  );

  const asset = library ? libraryAsset : digitalTwin;

  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={() => handleClick(asset, assetName, library, setShowDetails)}
    >
      Details
    </Button>
  );
}

export default DetailsButton;
