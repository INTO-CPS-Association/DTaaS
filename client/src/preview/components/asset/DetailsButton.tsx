import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectAssetByPathAndPrivacy } from 'preview/store/assets.slice';
import { DescriptionProvider } from 'model/backend/interfaces/sharedInterfaces';
import LibraryAsset from 'model/backend/libraryAsset';
import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';

interface DialogButtonProps {
  assetName: string;
  assetPrivacy: boolean;
  setShowDetails: Dispatch<SetStateAction<boolean>>;
  library?: boolean;
  assetPath?: string;
}

export const handleToggleDetailsDialog = async (
  asset: DescriptionProvider,
  setShowDetails: Dispatch<SetStateAction<boolean>>,
) => {
  await asset.getFullDescription();
  setShowDetails(true);
};

export const handleToggleDetailsLibraryDialog = async (
  asset: DescriptionProvider,
  setShowDetails: Dispatch<SetStateAction<boolean>>,
) => {
  await asset.getFullDescription();
  setShowDetails(true);
};

function DetailsButton({
  assetName,
  assetPrivacy,
  setShowDetails,
  library,
  assetPath,
}: DialogButtonProps) {
  const digitalTwin = useSelector(selectDigitalTwinByName(assetName));
  const libraryAsset = useSelector(
    selectAssetByPathAndPrivacy(assetPath || '', assetPrivacy),
  );

  const asset = library ? libraryAsset : digitalTwin;

  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={async () => {
        if (library && asset) {
          handleToggleDetailsLibraryDialog(
            asset as LibraryAsset,
            setShowDetails,
          );
        } else if (asset) {
          if ('DTName' in asset) {
            const digitalTwinInstance = await createDigitalTwinFromData(
              asset,
              assetName,
            );
            handleToggleDetailsDialog(digitalTwinInstance, setShowDetails);
          }
        }
      }}
    >
      Details
    </Button>
  );
}

export default DetailsButton;
