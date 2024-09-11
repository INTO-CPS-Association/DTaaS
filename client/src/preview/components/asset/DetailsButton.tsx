import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from 'store/digitalTwin.slice';
import DigitalTwin from 'util/gitlabDigitalTwin';

interface DialogButtonProps {
  name: string;
  setShowLog: Dispatch<React.SetStateAction<boolean>>;
}

const handleToggleLog = async (
  digitalTwin: DigitalTwin,
  setShowLog: Dispatch<SetStateAction<boolean>>,
) => {
  await digitalTwin.getFullDescription();
  setShowLog(true);
};

function DetailsButton({ name, setShowLog }: DialogButtonProps) {
  const digitalTwin = useSelector(selectDigitalTwinByName(name));
  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={() => handleToggleLog(digitalTwin, setShowLog)}
    >
      Details
    </Button>
  );
}

export default DetailsButton;
