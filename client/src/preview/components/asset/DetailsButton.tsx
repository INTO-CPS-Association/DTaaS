import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import LibraryAsset from 'preview/util/libraryAsset';
import { selectDigitalTwinByName } from '../../store/digitalTwin.slice';

import DigitalTwin from '../../util/digitalTwin';
import { selectAssetByPath } from 'preview/store/assets.slice';

interface DialogButtonProps {
  assetName: string;
  setShowDetails: Dispatch<SetStateAction<boolean>>;
  library?: boolean;
  assetPath?: string;
}

export const handleToggleDetailsDialog = async (
  digitalTwin: DigitalTwin | LibraryAsset,
  setShowDetails: Dispatch<SetStateAction<boolean>>,
) => {
  await digitalTwin.getFullDescription();
  setShowDetails(true);
};

export const handleToggleDetailsLibraryDialog = async (
  asset: LibraryAsset | DigitalTwin,
  setShowDetails: Dispatch<SetStateAction<boolean>>,
) => {
  await asset.getFullDescription();
  setShowDetails(true);
};

function DetailsButton({
  assetName,
  setShowDetails,
  library,
  assetPath,
}: DialogButtonProps) {
  const digitalTwin = useSelector(selectDigitalTwinByName(assetName));
  const libraryAsset = useSelector(selectAssetByPath(assetPath || ''));

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

