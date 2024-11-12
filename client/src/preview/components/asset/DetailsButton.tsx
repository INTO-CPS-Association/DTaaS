import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from '../../store/digitalTwin.slice';

import DigitalTwin from '../../util/digitalTwin';
import LibraryAsset from 'preview/util/LibraryAsset';

interface DialogButtonProps {
  assetName: string;
  setShowDetails: Dispatch<SetStateAction<boolean>>;
  library?: boolean;
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

const fakeAsset: LibraryAsset = {
  assetName: 'fakeAsset',
  path: 'fakePath',
  isPrivate: false,
  type: 'fakeType',
  fullDescription: 'fakeDescription',

  async getFullDescription() {
    this.fullDescription = 'This is a description';
  },
};
  
function DetailsButton({ assetName, setShowDetails, library }: DialogButtonProps) {
  const digitalTwin = useSelector(selectDigitalTwinByName(assetName));
  const assetLibrary = fakeAsset;

  const asset = library ? assetLibrary : digitalTwin;

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
