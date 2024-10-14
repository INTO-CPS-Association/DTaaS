import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from '../../store/digitalTwin.slice';
import DigitalTwin from '../../util/gitlabDigitalTwin';

interface DialogButtonProps {
  assetName: string;
  setShowDetails: Dispatch<React.SetStateAction<boolean>>;
}

export const handleToggleLog = async (
  digitalTwin: DigitalTwin,
  setShowDetails: Dispatch<SetStateAction<boolean>>,
) => {
  await digitalTwin.getFullDescription();
  setShowDetails(true);
};

function DetailsButton({ assetName, setShowDetails }: DialogButtonProps) {
  const digitalTwin = useSelector(selectDigitalTwinByName(assetName));
  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={() => handleToggleLog(digitalTwin, setShowDetails)}
    >
      Details
    </Button>
  );
}

export default DetailsButton;
