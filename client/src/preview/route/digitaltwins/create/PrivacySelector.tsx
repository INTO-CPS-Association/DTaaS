import { Box, FormControlLabel, Switch } from '@mui/material';
import React from 'react';

function PrivacySelector({
  isPrivate,
  onChange,
}: {
  isPrivate: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Box sx={{ display: 'flex', marginTop: 1 }}>
      <FormControlLabel
        control={<Switch checked={isPrivate} onChange={onChange} />}
        label={isPrivate ? 'Private' : 'Common'}
      />
    </Box>
  );
}

export default PrivacySelector;
