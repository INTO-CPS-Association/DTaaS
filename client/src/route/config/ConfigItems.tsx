import { ValidationType } from 'util/configUtil';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import { StatusCodes } from 'http-status-codes';

const ConfigIcon = (
  toolTipTitle: string,
  icon: React.ReactElement,
): React.ReactElement => (
  <Tooltip
    title={toolTipTitle}
    PopperProps={
      document.getElementById('root')
        ? { container: document.getElementById('root') }
        : undefined
    }
  >
    {icon}
  </Tooltip>
);

interface ValidationIconConfig {
  icon: React.ReactElement;
  hoverTip: string;
}

const getValidationIconConfig = (
  validation: ValidationType,
  label: string,
): ValidationIconConfig => {
  const { value, status, error } = validation;
  if (error) {
    return {
      icon: <ErrorOutlineIcon color="error" data-testid="error-icon" />,
      hoverTip: `${label} threw the following error: ${error}`,
    };
  }

  // If status is undefined then the validation is derived from a parsing.
  const statusIsAcceptable = status === StatusCodes.OK || status === undefined;

  return statusIsAcceptable
    ? {
        icon: <CheckCircleIcon color="success" data-testid="success-icon" />,
        hoverTip: `${label} field is configured correctly.`,
      }
    : {
        icon: <ErrorOutlineIcon color="warning" data-testid="warning-icon" />,
        hoverTip: `${label} field may not be configured correctly. ${value} responded with status code ${status}.`,
      };
};

export const getConfigIcon = (
  validation: ValidationType,
  label: string,
): React.ReactElement => {
  const { icon, hoverTip } = getValidationIconConfig(validation, label);
  return ConfigIcon(hoverTip, icon);
};

export const ConfigItem: React.FC<{
  label: string;
  value: string;
  validation: ValidationType;
}> = ({ label, value, validation = { error: 'Validation unavailable' } }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      margin: '5px 0',
    }}
    className="Config-item"
  >
    {getConfigIcon(validation, label)}
    <Typography
      sx={{
        fontSize: 'clamp(0.1rem, 4vw, 1rem)',
        padding: 'clamp(0, 4vw, 5%)',
      }}
    >
      <strong>{label}:</strong> {value}
    </Typography>
  </div>
);
ConfigItem.displayName = 'ConfigItem';

export const loadingComponent = (): React.ReactNode => (
  <Box
    sx={{
      marginTop: 8,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}
  >
    Verifying configuration
    <CircularProgress data-testid="loading-icon" />
  </Box>
);
