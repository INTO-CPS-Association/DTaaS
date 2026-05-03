import { TextField, Typography, Grid, Divider } from '@mui/material';
import { SettingsFieldProps } from 'route/account/SettingsForm';

interface FieldConfig {
  id: string;
  label: string;
  errorMsg: string;
  helpMsg: string;
}

const FIELD_CONFIGS: FieldConfig[] = [
  {
    id: 'groupName',
    label: 'Group Name',
    errorMsg: 'Group name is required',
    helpMsg: 'The group name used for GitLab operations',
  },
  {
    id: 'dtDirectory',
    label: 'DT Directory',
    errorMsg: 'DT directory is required',
    helpMsg: 'Directory for Digital Twin files',
  },
  {
    id: 'commonLibraryProjectName',
    label: 'Common Library Project name',
    errorMsg: 'Common library project name is required',
    helpMsg: 'Project name for the common library',
  },
  {
    id: 'runnerTag',
    label: 'Runner Tag',
    errorMsg: 'Runner tag is required',
    helpMsg: 'Tag used for GitLab CI runners (e.g., linux, windows)',
  },
  {
    id: 'branchName',
    label: 'Branch Name',
    errorMsg: 'Branch name is required',
    helpMsg: 'Default branch name for GitLab projects',
  },
];

const ApplicationSettingsFields: React.FC<SettingsFieldProps> = ({
  formValues,
  fieldErrors,
  handleInputChange,
}) => (
  <>
    <Typography variant="h6" gutterBottom>
      Application Settings
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      {FIELD_CONFIGS.map(({ id, label, errorMsg, helpMsg }) => (
        <Grid key={id} size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            id={id}
            label={label}
            variant="outlined"
            value={formValues[id]}
            onChange={handleInputChange}
            error={fieldErrors[id]}
            helperText={fieldErrors[id] ? errorMsg : helpMsg}
          />
        </Grid>
      ))}
    </Grid>
  </>
);

export default ApplicationSettingsFields;
