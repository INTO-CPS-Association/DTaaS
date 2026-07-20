import { Button, Grid, Stack } from '@mui/material';
import { Save as SaveIcon, RestartAlt as ResetIcon } from '@mui/icons-material';

interface SettingsFormButtonsProps {
  onReset: () => void;
  onSave: () => void;
}

function SettingsFormButtons({
  onReset,
  onSave,
}: Readonly<SettingsFormButtonsProps>) {
  return (
    <Grid container>
      <Grid
        size={{ xs: 12 }}
        sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}
      >
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ResetIcon />}
            onClick={onReset}
            data-logger-element="button"
            data-logger-label="Reset to Defaults"
          >
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={onSave}
            data-logger-element="button"
            data-logger-label="Save Settings"
          >
            Save Settings
          </Button>
        </Stack>
      </Grid>
    </Grid>
  );
}

export default SettingsFormButtons;
