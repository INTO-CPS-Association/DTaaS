import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Typography,
} from '@mui/material';
import { SettingsFieldProps } from 'route/account/SettingsForm';
import { isRemoteLoggerConfigured } from 'store/settings.slice';

const NOTICE_KEY = 'remoteLoggingConsentNoticeDismissed';

const hasDismissedNotice = (): boolean =>
  localStorage.getItem(NOTICE_KEY) === 'true';

const shouldShowRemoteLoggingNotice = (): boolean =>
  isRemoteLoggerConfigured() && !hasDismissedNotice();

function useRemoteLoggingNotice(): [boolean, () => void] {
  const [visible, setVisible] = useState(shouldShowRemoteLoggingNotice());
  const dismiss = () => {
    localStorage.setItem(NOTICE_KEY, 'true');
    setVisible(false);
  };
  return [visible, dismiss];
}

const RemoteLoggingNotice: React.FC<{ loggingEnabled: boolean }> = ({
  loggingEnabled,
}) => {
  const [visible, dismissNotice] = useRemoteLoggingNotice();

  if (!visible) return null;

  return (
    <Alert
      severity="info"
      sx={{ mb: 3 }}
      action={
        <Button color="inherit" size="small" onClick={dismissNotice}>
          Dismiss
        </Button>
      }
    >
      {loggingEnabled
        ? 'Remote logging sends workflow events to the configured logger. Keep it enabled only with participant consent.'
        : 'Remote logging is available but remains disabled until enabled with participant consent.'}
    </Alert>
  );
};

const LoggingSettingsFields: React.FC<SettingsFieldProps> = ({
  formValues,
  handleInputChange,
}) => (
  <>
    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
      Logging Settings
    </Typography>
    <Divider sx={{ mb: 3 }} />
    <RemoteLoggingNotice loggingEnabled={Boolean(formValues.loggingEnabled)} />

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
              data-logger-capture-value="true"
              data-logger-context={JSON.stringify({
                settings: { section: 'logging', field: 'loggingEnabled' },
              })}
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
