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
  setBranchName,
} from 'store/settings.slice';
import {
  Button,
  TextField,
  Paper,
  Typography,
  Grid,
  Box,
  Divider,
  Snackbar,
  Alert,
  Stack,
} from '@mui/material';
import { Save as SaveIcon, RestartAlt as ResetIcon } from '@mui/icons-material';

const SettingsForm: React.FC = () => {
  const dispatch = useDispatch();
  const {
    GROUP_NAME,
    DT_DIRECTORY,
    COMMON_LIBRARY_PROJECT_NAME,
    RUNNER_TAG,
    BRANCH_NAME,
  } = useSelector((state: RootState) => state.settings);

  // Local state for form values - prevents saving on each keystroke
  const [formValues, setFormValues] = useState({
    groupName: GROUP_NAME,
    dtDirectory: DT_DIRECTORY,
    commonLibraryProjectName: COMMON_LIBRARY_PROJECT_NAME,
    runnerTag: RUNNER_TAG,
    branchName: BRANCH_NAME,
  });

  // Notification state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState(
    'Settings saved successfully!',
  );

  // Update local state when Redux state changes
  useEffect(() => {
    setFormValues({
      groupName: GROUP_NAME,
      dtDirectory: DT_DIRECTORY,
      commonLibraryProjectName: COMMON_LIBRARY_PROJECT_NAME,
      runnerTag: RUNNER_TAG,
      branchName: BRANCH_NAME,
    });
  }, [
    GROUP_NAME,
    DT_DIRECTORY,
    COMMON_LIBRARY_PROJECT_NAME,
    RUNNER_TAG,
    BRANCH_NAME,
  ]);

  // Handle local form changes without dispatching to Redux
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target;

    setFormValues((prev) => {
      if (id === 'groupName') {
        return { ...prev, groupName: value };
      }
      if (id === 'dtDirectory') {
        return { ...prev, dtDirectory: value };
      }
      if (id === 'commonLibraryProjectName') {
        return { ...prev, commonLibraryProjectName: value };
      }
      if (id === 'runnerTag') {
        return { ...prev, runnerTag: value };
      }
      return { ...prev, branchName: value };
    });
  };

  // Reset form to default values
  const handleResetToDefaults = () => {
    setFormValues({
      groupName: DEFAULT_SETTINGS.GROUP_NAME,
      dtDirectory: DEFAULT_SETTINGS.DT_DIRECTORY,
      commonLibraryProjectName: DEFAULT_SETTINGS.COMMON_LIBRARY_PROJECT_NAME,
      runnerTag: DEFAULT_SETTINGS.RUNNER_TAG,
      branchName: DEFAULT_SETTINGS.BRANCH_NAME,
    });

    dispatch(resetToDefaults());

    setNotificationMessage('Settings reset to defaults');
    setShowNotification(true);
  };

  // Save all settings at once
  const handleSaveSettings = () => {
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

    setNotificationMessage('Settings saved successfully!');
    setShowNotification(true);
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {/* Application Settings Section */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Application Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              id="groupName"
              label="Group Name"
              variant="outlined"
              value={formValues.groupName}
              onChange={handleInputChange}
              helperText="The group name used for GitLab operations"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              id="dtDirectory"
              label="DT Directory"
              variant="outlined"
              value={formValues.dtDirectory}
              onChange={handleInputChange}
              helperText="Directory for Digital Twin files"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              id="commonLibraryProjectName"
              label="Common Library Project name"
              variant="outlined"
              value={formValues.commonLibraryProjectName}
              onChange={handleInputChange}
              helperText="Project name for the common library"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              id="runnerTag"
              label="Runner Tag"
              variant="outlined"
              value={formValues.runnerTag}
              onChange={handleInputChange}
              helperText="Tag used for GitLab CI runners (e.g., linux, windows)"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              id="branchName"
              label="Branch Name"
              variant="outlined"
              value={formValues.branchName}
              onChange={handleInputChange}
              helperText="Default branch name for GitLab projects"
            />
          </Grid>

          <Grid
            size={{ xs: 12 }}
            sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}
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
        <Alert onClose={() => setShowNotification(false)} severity="success">
          {notificationMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsForm;
