import { useState, useEffect, useRef } from 'react';
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
import useAvailableHeight from 'util/useAvailableHeight';

export interface SettingsFieldProps {
  formValues: FormValues;
  fieldErrors: Record<string, boolean>;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function createFormValues(settings: {
  GROUP_NAME: string;
  DT_DIRECTORY: string;
  COMMON_LIBRARY_PROJECT_NAME: string;
  RUNNER_TAG: string;
  BRANCH_NAME: string;
  trials: number;
  secondaryRunnerTag: string;
  primaryDTName: string;
  secondaryDTName: string;
  loggingEnabled: boolean;
}): FormValues {
  return {
    groupName: settings.GROUP_NAME,
    dtDirectory: settings.DT_DIRECTORY,
    commonLibraryProjectName: settings.COMMON_LIBRARY_PROJECT_NAME,
    runnerTag: settings.RUNNER_TAG,
    branchName: settings.BRANCH_NAME,
    measurementTrials: String(settings.trials),
    measurementSecondaryRunnerTag: settings.secondaryRunnerTag,
    measurementPrimaryDTName: settings.primaryDTName,
    measurementSecondaryDTName: settings.secondaryDTName,
    loggingEnabled: settings.loggingEnabled,
  };
}

function resetFormValues(dispatch: ReturnType<typeof useDispatch>): FormValues {
  dispatch(resetToDefaults());
  updateFrozenSettings();
  return createFormValues({
    GROUP_NAME: DEFAULT_SETTINGS.GROUP_NAME,
    DT_DIRECTORY: DEFAULT_SETTINGS.DT_DIRECTORY,
    COMMON_LIBRARY_PROJECT_NAME: DEFAULT_SETTINGS.COMMON_LIBRARY_PROJECT_NAME,
    RUNNER_TAG: DEFAULT_SETTINGS.RUNNER_TAG,
    BRANCH_NAME: DEFAULT_SETTINGS.BRANCH_NAME,
    trials: DEFAULT_MEASUREMENT.trials,
    secondaryRunnerTag: DEFAULT_MEASUREMENT.secondaryRunnerTag,
    primaryDTName: DEFAULT_MEASUREMENT.primaryDTName,
    secondaryDTName: DEFAULT_MEASUREMENT.secondaryDTName,
    loggingEnabled: DEFAULT_SETTINGS.loggingEnabled,
  });
}

interface SaveSettingsResult {
  errors: Record<string, boolean>;
  needsRefresh: boolean;
}

interface SettingsSnapshot {
  GROUP_NAME: string;
  DT_DIRECTORY: string;
  COMMON_LIBRARY_PROJECT_NAME: string;
  RUNNER_TAG: string;
  BRANCH_NAME: string;
  trials: number;
  secondaryRunnerTag: string;
  primaryDTName: string;
  secondaryDTName: string;
  loggingEnabled: boolean;
}

function saveSettings(
  formValues: FormValues,
  dispatch: ReturnType<typeof useDispatch>,
  current: SettingsSnapshot,
): SaveSettingsResult {
  const errors = validateSettingsForm(formValues);
  if (Object.keys(errors).length > 0) return { errors, needsRefresh: false };
  const needsRefresh = dispatchChangedSettings(dispatch, formValues, {
    GROUP_NAME: current.GROUP_NAME,
    DT_DIRECTORY: current.DT_DIRECTORY,
    COMMON_LIBRARY_PROJECT_NAME: current.COMMON_LIBRARY_PROJECT_NAME,
    RUNNER_TAG: current.RUNNER_TAG,
    BRANCH_NAME: current.BRANCH_NAME,
    MEASUREMENT_TRIALS: current.trials,
    MEASUREMENT_SECONDARY_RUNNER_TAG: current.secondaryRunnerTag,
    MEASUREMENT_PRIMARY_DT_NAME: current.primaryDTName,
    MEASUREMENT_SECONDARY_DT_NAME: current.secondaryDTName,
    LOGGING_ENABLED: current.loggingEnabled,
  });
  updateFrozenSettings();
  return { errors: {}, needsRefresh };
}

const SettingsForm: React.FC = () => {
  const paperRef = useRef<HTMLDivElement>(null);
  const paperMaxHeight = useAvailableHeight(paperRef, { minHeight: 0 });
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
  const currentSettings = {
    GROUP_NAME,
    DT_DIRECTORY,
    COMMON_LIBRARY_PROJECT_NAME,
    RUNNER_TAG,
    BRANCH_NAME,
    trials: MEASUREMENT_TRIALS,
    secondaryRunnerTag: MEASUREMENT_SECONDARY_RUNNER_TAG,
    primaryDTName: MEASUREMENT_PRIMARY_DT_NAME,
    secondaryDTName: MEASUREMENT_SECONDARY_DT_NAME,
    loggingEnabled: LOGGING_ENABLED,
  };
  const [formValues, setFormValues] = useState<FormValues>(
    createFormValues(currentSettings),
  );

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
    setFormValues(createFormValues(currentSettings));
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
    setFormValues(resetFormValues(dispatch));
    setFieldErrors({});

    setNotificationMessage('Settings reset to defaults');
    setShowNotification(true);
  };

  const handleSaveSettings = () => {
    const result = saveSettings(formValues, dispatch, currentSettings);
    if (Object.keys(result.errors).length > 0) {
      setFieldErrors(result.errors);
      return;
    }
    setNotificationMessage('Settings saved successfully!');
    setNotificationSeverity('success');
    setShowNotification(true);

    if (result.needsRefresh) {
      dispatch(clearDigitalTwins());
      setTwinsLoading(true);
      fetchDigitalTwins(dispatch, () => {}).finally(() =>
        setTwinsLoading(false),
      );
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
        ref={paperRef}
        elevation={2}
        sx={{ p: 3, maxHeight: paperMaxHeight, overflowY: 'auto' }}
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
