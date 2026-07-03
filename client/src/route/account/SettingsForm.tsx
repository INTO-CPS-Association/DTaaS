import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'store/store';
import {
  resetToDefaults,
  DEFAULT_SETTINGS,
  DEFAULT_MEASUREMENT,
  setBranchName,
  setDTDirectory,
  setPrimaryDTName,
  setSecondaryDTName,
} from 'store/settings.slice';
import {
  validateSettingsForm,
  dispatchChangedSettings,
  type FormValues,
} from 'route/account/settingsFormActions';
import { Paper, Box, Snackbar, Alert } from '@mui/material';
import ApplicationSettingsFields from 'route/account/ApplicationSettingsFields';
import LoggingSettingsFields from 'route/account/LoggingSettingsFields';
import MeasurementSettingsFields from 'route/account/MeasurementSettingsFields';
import SettingsFormButtons from 'route/account/SettingsFormButtons';
import { fetchDigitalTwins } from 'model/backend/util/init';
import { clearDigitalTwins } from 'model/backend/state/digitalTwin.slice';
import { updateFrozenSettings } from 'model/backend/gitlab/measure/measurement.settings';

export interface SettingsFieldProps {
  formValues: FormValues;
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
    loggingEnabled: LOGGING_ENABLED,
  } = useSelector((state: RootState) => state.settings);
  const {
    trials: MEASUREMENT_TRIALS,
    secondaryRunnerTag: MEASUREMENT_SECONDARY_RUNNER_TAG,
    primaryDTName: MEASUREMENT_PRIMARY_DT_NAME,
    secondaryDTName: MEASUREMENT_SECONDARY_DT_NAME,
  } = useSelector((state: RootState) => state.settings);

  // Local state for form values - prevents saving on each keystroke
  const [formValues, setFormValues] = useState<FormValues>({
    groupName: GROUP_NAME,
    dtDirectory: DT_DIRECTORY,
    commonLibraryProjectName: COMMON_LIBRARY_PROJECT_NAME,
    runnerTag: RUNNER_TAG,
    branchName: BRANCH_NAME,
    measurementTrials: String(MEASUREMENT_TRIALS),
    measurementSecondaryRunnerTag: MEASUREMENT_SECONDARY_RUNNER_TAG,
    measurementPrimaryDTName: MEASUREMENT_PRIMARY_DT_NAME,
    measurementSecondaryDTName: MEASUREMENT_SECONDARY_DT_NAME,
    loggingEnabled: LOGGING_ENABLED,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!twinsLoading) {
      const names = Object.keys(digitalTwins);
      if (names.length > 0) {
        if (!names.includes(MEASUREMENT_PRIMARY_DT_NAME)) {
          dispatch(setPrimaryDTName(names[0]));
        }
        if (!names.includes(MEASUREMENT_SECONDARY_DT_NAME)) {
          dispatch(setSecondaryDTName(names[0]));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twinsLoading]);

  const handleRefreshTwins = () => {
    if (formValues.branchName !== BRANCH_NAME) {
      dispatch(setBranchName(formValues.branchName));
    }
    if (formValues.dtDirectory !== DT_DIRECTORY) {
      dispatch(setDTDirectory(formValues.dtDirectory));
    }
    dispatch(clearDigitalTwins());
    setTwinsLoading(true);
    fetchDigitalTwins(dispatch, () => {}).finally(() => setTwinsLoading(false));
  };

  // Sync local form state when Redux state changes (e.g. external reset)
  const reduxKey = `${GROUP_NAME}|${DT_DIRECTORY}|${COMMON_LIBRARY_PROJECT_NAME}|${RUNNER_TAG}|${BRANCH_NAME}|${MEASUREMENT_TRIALS}|${MEASUREMENT_SECONDARY_RUNNER_TAG}|${MEASUREMENT_PRIMARY_DT_NAME}|${MEASUREMENT_SECONDARY_DT_NAME}|${LOGGING_ENABLED}`;
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
      loggingEnabled: LOGGING_ENABLED,
    });
    setFieldErrors({});
  }

  // Handle local form changes without dispatching to Redux
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked, id, type, value } = event.target;
    const nextValue = type === 'checkbox' ? checked : value;

    setFormValues((prev) => ({ ...prev, [id]: nextValue }));
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
      loggingEnabled: DEFAULT_SETTINGS.loggingEnabled,
    });
    setFieldErrors({});

    dispatch(resetToDefaults());
    updateFrozenSettings();

    setNotificationMessage('Settings reset to defaults');
    setShowNotification(true);
  };

  const handleSaveSettings = () => {
    const errors = validateSettingsForm(formValues);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
    } else {
      const current = {
        GROUP_NAME,
        DT_DIRECTORY,
        COMMON_LIBRARY_PROJECT_NAME,
        RUNNER_TAG,
        BRANCH_NAME,
        MEASUREMENT_TRIALS,
        MEASUREMENT_SECONDARY_RUNNER_TAG,
        MEASUREMENT_PRIMARY_DT_NAME,
        MEASUREMENT_SECONDARY_DT_NAME,
        LOGGING_ENABLED,
      };
      const needsRefresh = dispatchChangedSettings(
        dispatch,
        formValues,
        current,
      );
      updateFrozenSettings();

      setNotificationMessage('Settings saved successfully!');
      setNotificationSeverity('success');
      setShowNotification(true);

      if (needsRefresh) {
        dispatch(clearDigitalTwins());
        setTwinsLoading(true);
        fetchDigitalTwins(dispatch, () => {}).finally(() =>
          setTwinsLoading(false),
        );
      }
    }
  };

  const fieldProps: SettingsFieldProps = {
    formValues,
    fieldErrors,
    handleInputChange,
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Paper
        elevation={2}
        sx={{ p: 3, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}
      >
        <ApplicationSettingsFields {...fieldProps} />
        <MeasurementSettingsFields
          {...fieldProps}
          twinsLoading={twinsLoading}
          onRefreshTwins={handleRefreshTwins}
        />
        <LoggingSettingsFields {...fieldProps} />
        <SettingsFormButtons
          onReset={handleResetToDefaults}
          onSave={handleSaveSettings}
        />
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
