import {
  TextField,
  Typography,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  Box,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { SettingsFieldProps } from 'route/account/SettingsForm';

interface MeasurementSettingsFieldsProps extends SettingsFieldProps {
  twinsLoading: boolean;
  onRefreshTwins: () => void;
}

function dtHelperText(
  hasError: boolean,
  loading: boolean,
  description: string,
): string {
  if (hasError) return 'Please select a Digital Twin';
  if (loading) return 'Loading available digital twins...';
  return description;
}

interface DTSelectFieldProps {
  id: string;
  label: string;
  value: string;
  hasError: boolean;
  helperText: string;
  disabled: boolean;
  onChange: SettingsFieldProps['handleInputChange'];
  loading: boolean;
  twinNames: string[];
  onRefresh?: () => void;
}

function DTSelectField({
  id,
  label,
  value,
  hasError,
  helperText,
  disabled,
  onChange,
  loading,
  twinNames,
  onRefresh,
}: Readonly<DTSelectFieldProps>) {
  const field = (
    <TextField
      select
      slotProps={{
        select: { native: true },
        inputLabel: { shrink: true },
        htmlInput: {
          'data-logger-element': 'select',
          'data-logger-label': label,
          'data-logger-capture-value': 'true',
          'data-logger-context': JSON.stringify({
            settings: { section: 'measurement', field: id },
          }),
        },
      }}
      fullWidth
      id={id}
      label={label}
      variant="outlined"
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={hasError}
      helperText={helperText}
      sx={onRefresh ? { flex: 1 } : undefined}
    >
      {loading ? (
        <option value={value}>{value}</option>
      ) : (
        twinNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))
      )}
    </TextField>
  );

  return (
    <Grid size={{ xs: 12, md: 6 }}>
      {onRefresh ? (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          {field}
          <Tooltip title="Refresh digital twins">
            <span>
              <IconButton
                aria-label="Refresh digital twins"
                onClick={onRefresh}
                disabled={loading}
                size="small"
                sx={{ mt: 1 }}
                data-logger-element="button"
                data-logger-label="Refresh Digital Twins"
                data-logger-context={JSON.stringify({
                  settings: {
                    section: 'measurement',
                    button: 'refresh-digital-twins',
                  },
                })}
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ) : (
        field
      )}
    </Grid>
  );
}

const MeasurementSettingsFields: React.FC<MeasurementSettingsFieldsProps> = ({
  formValues,
  fieldErrors,
  handleInputChange,
  twinsLoading,
  onRefreshTwins,
}) => {
  const digitalTwins = useSelector(
    (state: RootState) => state.digitalTwin.digitalTwin,
  );
  const twinNames = Object.keys(digitalTwins);

  return (
    <>
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Measurement Settings
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            id="measurementTrials"
            label="Trial Number"
            type="number"
            variant="outlined"
            value={formValues.measurementTrials}
            onChange={handleInputChange}
            error={fieldErrors.measurementTrials}
            helperText={
              fieldErrors.measurementTrials
                ? 'Trial number is required and must be at least 1'
                : 'Number of times each task is repeated to calculate average execution time'
            }
            slotProps={{
              htmlInput: {
                min: 1,
                'data-logger-element': 'input',
                'data-logger-label': 'Trial Number',
                'data-logger-capture-value': 'true',
                'data-logger-context': JSON.stringify({
                  settings: {
                    section: 'measurement',
                    field: 'measurementTrials',
                  },
                }),
              },
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            id="measurementSecondaryRunnerTag"
            label="Measurement Secondary Runner Tag"
            variant="outlined"
            value={formValues.measurementSecondaryRunnerTag}
            onChange={handleInputChange}
            error={fieldErrors.measurementSecondaryRunnerTag}
            helperText={
              fieldErrors.measurementSecondaryRunnerTag
                ? 'Measurement secondary runner tag is required'
                : 'Runner tag used for multi-runner measurement tests'
            }
            slotProps={{
              htmlInput: {
                'data-logger-element': 'input',
                'data-logger-label': 'Measurement Secondary Runner Tag',
                'data-logger-capture-value': 'true',
                'data-logger-context': JSON.stringify({
                  settings: {
                    section: 'measurement',
                    field: 'measurementSecondaryRunnerTag',
                  },
                }),
              },
            }}
          />
        </Grid>

        <DTSelectField
          id="measurementPrimaryDTName"
          label="Primary Digital Twin"
          value={formValues.measurementPrimaryDTName}
          hasError={fieldErrors.measurementPrimaryDTName}
          helperText={dtHelperText(
            fieldErrors.measurementPrimaryDTName,
            twinsLoading,
            'Digital Twin used in single-DT and same-DT measurement tasks',
          )}
          disabled={twinsLoading}
          onChange={handleInputChange}
          loading={twinsLoading}
          twinNames={twinNames}
        />

        <DTSelectField
          id="measurementSecondaryDTName"
          label="Secondary Digital Twin"
          value={formValues.measurementSecondaryDTName}
          hasError={fieldErrors.measurementSecondaryDTName}
          helperText={dtHelperText(
            fieldErrors.measurementSecondaryDTName,
            twinsLoading,
            'Digital Twin used as the second DT in multi-DT measurement tasks',
          )}
          disabled={twinsLoading}
          onChange={handleInputChange}
          loading={twinsLoading}
          twinNames={twinNames}
          onRefresh={onRefreshTwins}
        />
      </Grid>
    </>
  );
};

export default MeasurementSettingsFields;
