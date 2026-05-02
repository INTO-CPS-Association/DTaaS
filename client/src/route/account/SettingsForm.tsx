import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'store/store';
import {
  setGroupName,
  setDTDirectory,
  setCommonLibraryProjectName,
  setRunnerTag,
  resetToDefaults,
  DEFAULT_SETTINGS,
  DEFAULT_MEASUREMENT,
  setBranchName,
  setTrials,
  setSecondaryRunnerTag,
  setPrimaryDTName,
  setSecondaryDTName,
} from 'store/settings.slice';
import {
  Button,
  Paper,
  Grid,
  Box,
  Snackbar,
  Alert,
  Stack,
} from '@mui/material';
import { Save as SaveIcon, RestartAlt as ResetIcon } from '@mui/icons-material';
import ApplicationSettingsFields from 'route/account/ApplicationSettingsFields';
import MeasurementSettingsFields from 'route/account/MeasurementSettingsFields';
import { fetchDigitalTwins } from 'model/backend/util/init';
import { updateFrozenSettings } from 'model/backend/gitlab/measure/measurement.settings';

export interface SettingsFieldProps {
  formValues: Record<string, string>;
  fieldErrors: Record<string, boolean>;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SettingsForm: React.FC = () => {
  const dispatch = useDispatch();
  const digitalTwins = useSelector(
    (state: RootState) => state.digitalTwin.digitalTwin,
  );
  const {
    GROUP_NAME,
    DT_DIRECTORY,
    COMMON_LIBRARY_PROJECT_NAME,
    RUNNER_TAG,
    BRANCH_NAME,
  } = useSelector((state: RootState) => state.settings);
  const {
    trials: MEASUREMENT_TRIALS,
    secondaryRunnerTag: MEASUREMENT_SECONDARY_RUNNER_TAG,
    primaryDTName: MEASUREMENT_PRIMARY_DT_NAME,
    secondaryDTName: MEASUREMENT_SECONDARY_DT_NAME,
  } = useSelector((state: RootState) => state.settings);

  // Local state for form values - prevents saving on each keystroke
  const [formValues, setFormValues] = useState({
    groupName: GROUP_NAME,
    dtDirectory: DT_DIRECTORY,
    commonLibraryProjectName: COMMON_LIBRARY_PROJECT_NAME,
    runnerTag: RUNNER_TAG,
    branchName: BRANCH_NAME,
    measurementTrials: String(MEASUREMENT_TRIALS),
    measurementSecondaryRunnerTag: MEASUREMENT_SECONDARY_RUNNER_TAG,
    measurementPrimaryDTName: MEASUREMENT_PRIMARY_DT_NAME,
    measurementSecondaryDTName: MEASUREMENT_SECONDARY_DT_NAME,
  });

  // Validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  // Notification state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState(
    'Settings saved successfully!',
  );
  const [notificationSeverity, setNotificationSeverity] = useState<
    'success' | 'error'
  >('success');

  const [twinsLoading, setTwinsLoading] = useState(
    Object.keys(digitalTwins).length === 0,
  );

  useEffect(() => {
    if (Object.keys(digitalTwins).length === 0) {
      fetchDigitalTwins(dispatch, () => {}).finally(() =>
        setTwinsLoading(false),
      );
    }
  }, [dispatch, digitalTwins]);

  // Sync local form state when Redux state changes (e.g. external reset)
  const reduxKey = `${GROUP_NAME}|${DT_DIRECTORY}|${COMMON_LIBRARY_PROJECT_NAME}|${RUNNER_TAG}|${BRANCH_NAME}|${MEASUREMENT_TRIALS}|${MEASUREMENT_SECONDARY_RUNNER_TAG}|${MEASUREMENT_PRIMARY_DT_NAME}|${MEASUREMENT_SECONDARY_DT_NAME}`;
  const [prevReduxKey, setPrevReduxKey] = useState(reduxKey);
  if (prevReduxKey !== reduxKey) {
    setPrevReduxKey(reduxKey);
    setFormValues({
      groupName: GROUP_NAME,
      dtDirectory: DT_DIRECTORY,
      commonLibraryProjectName: COMMON_LIBRARY_PROJECT_NAME,
      runnerTag: RUNNER_TAG,
      branchName: BRANCH_NAME,
      measurementTrials: String(MEASUREMENT_TRIALS),
      measurementSecondaryRunnerTag: MEASUREMENT_SECONDARY_RUNNER_TAG,
      measurementPrimaryDTName: MEASUREMENT_PRIMARY_DT_NAME,
      measurementSecondaryDTName: MEASUREMENT_SECONDARY_DT_NAME,
    });
    setFieldErrors({});
  }

  // Handle local form changes without dispatching to Redux
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target;

    setFormValues((prev) => ({ ...prev, [id]: value }));
    if (fieldErrors[id]) {
      setFieldErrors((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Reset form to default values
  const handleResetToDefaults = () => {
    setFormValues({
      groupName: DEFAULT_SETTINGS.GROUP_NAME,
      dtDirectory: DEFAULT_SETTINGS.DT_DIRECTORY,
      commonLibraryProjectName: DEFAULT_SETTINGS.COMMON_LIBRARY_PROJECT_NAME,
      runnerTag: DEFAULT_SETTINGS.RUNNER_TAG,
      branchName: DEFAULT_SETTINGS.BRANCH_NAME,
      measurementTrials: String(DEFAULT_MEASUREMENT.trials),
      measurementSecondaryRunnerTag: DEFAULT_MEASUREMENT.secondaryRunnerTag,
      measurementPrimaryDTName: DEFAULT_MEASUREMENT.primaryDTName,
      measurementSecondaryDTName: DEFAULT_MEASUREMENT.secondaryDTName,
    });
    setFieldErrors({});

    dispatch(resetToDefaults());
    updateFrozenSettings();

    setNotificationMessage('Settings reset to defaults');
    setShowNotification(true);
  };

  // Save all settings at once
  const handleSaveSettings = () => {
    const requiredStringFields = [
      'groupName',
      'dtDirectory',
      'commonLibraryProjectName',
      'runnerTag',
      'branchName',
      'measurementSecondaryRunnerTag',
      'measurementPrimaryDTName',
      'measurementSecondaryDTName',
    ] as const;

    const errors: Record<string, boolean> = {};
    for (const field of requiredStringFields) {
      if (!formValues[field].trim()) {
        errors[field] = true;
      }
    }

    const trialsValue = Number.parseInt(formValues.measurementTrials, 10);
    if (
      !formValues.measurementTrials.trim() ||
      Number.isNaN(trialsValue) ||
      trialsValue < 1
    ) {
      errors.measurementTrials = true;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (formValues.groupName !== GROUP_NAME) {
      dispatch(setGroupName(formValues.groupName));
    }

    if (formValues.dtDirectory !== DT_DIRECTORY) {
      dispatch(setDTDirectory(formValues.dtDirectory));
    }

    if (formValues.commonLibraryProjectName !== COMMON_LIBRARY_PROJECT_NAME) {
      dispatch(
        setCommonLibraryProjectName(formValues.commonLibraryProjectName),
      );
    }

    if (formValues.runnerTag !== RUNNER_TAG) {
      dispatch(setRunnerTag(formValues.runnerTag));
    }

    if (formValues.branchName !== BRANCH_NAME) {
      dispatch(setBranchName(formValues.branchName));
    }

    if (trialsValue !== MEASUREMENT_TRIALS) {
      dispatch(setTrials(trialsValue));
    }

    if (
      formValues.measurementSecondaryRunnerTag !==
      MEASUREMENT_SECONDARY_RUNNER_TAG
    ) {
      dispatch(setSecondaryRunnerTag(formValues.measurementSecondaryRunnerTag));
    }

    if (formValues.measurementPrimaryDTName !== MEASUREMENT_PRIMARY_DT_NAME) {
      dispatch(setPrimaryDTName(formValues.measurementPrimaryDTName));
    }

    if (
      formValues.measurementSecondaryDTName !== MEASUREMENT_SECONDARY_DT_NAME
    ) {
      dispatch(setSecondaryDTName(formValues.measurementSecondaryDTName));
    }

    updateFrozenSettings();

    setNotificationMessage('Settings saved successfully!');
    setNotificationSeverity('success');
    setShowNotification(true);
  };

  const fieldProps: SettingsFieldProps = {
    formValues,
    fieldErrors,
    handleInputChange,
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <ApplicationSettingsFields {...fieldProps} />
        <MeasurementSettingsFields
          {...fieldProps}
          twinsLoading={twinsLoading}
        />

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
                onClick={handleResetToDefaults}
              >
                Reset to Defaults
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
              >
                Save Settings
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={showNotification}
        autoHideDuration={4000}
        onClose={() => setShowNotification(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowNotification(false)}
          severity={notificationSeverity}
        >
          {notificationMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsForm;
