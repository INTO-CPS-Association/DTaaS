import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectAssetByPathAndPrivacy } from 'preview/store/assets.slice';
import { DescriptionProvider } from 'model/backend/gitlab/UtilityInterfaces';
import { selectDigitalTwinByName } from '../../store/digitalTwin.slice';

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
      onClick={() => {
        if (library && asset) {
          handleToggleDetailsLibraryDialog(asset, setShowDetails);
        } else if (asset) {
          handleToggleDetailsDialog(asset, setShowDetails);
        }
      }}
    >
      Details
    </Button>
  );
}

export default DetailsButton;
