import {
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Typography,
} from '@mui/material';
import { SettingsFieldProps } from 'route/account/SettingsForm';

const LoggingSettingsFields: React.FC<SettingsFieldProps> = ({
  formValues,
  handleInputChange,
}) => (
  <>
    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
      Logging Settings
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <FormControlLabel
          control={
            <Checkbox
              id="loggingEnabled"
              checked={Boolean(formValues.loggingEnabled)}
              onChange={handleInputChange}
              data-logger-element="checkbox"
              data-logger-label="Toggle Logging"
            />
          }
          label="Enable logging"
        />
        <Typography variant="body2" color="text.secondary">
          Capture local workflow events, navigation, and notifications.
        </Typography>
      </Grid>
    </Grid>
  </>
);

export default LoggingSettingsFields;
