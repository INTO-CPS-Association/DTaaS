import * as React from 'react';
import { Button } from '@mui/material';
// import { Asset } from './Asset';
// import useCart from '../../store/CartAccess';

function StartStopButton() {
  // const { state, actions } = useCart();
  const [isStarted, setIsStarted] = React.useState(false);

  return (
    <Button
      variant="contained"
      // disabled={isDisabled}
      size="small"
      color="primary"
      onClick={() => setIsStarted(!isStarted)}
    >
      {isStarted ? 'Stop' : 'Start'}
    </Button>
  );
}

export default StartStopButton;
