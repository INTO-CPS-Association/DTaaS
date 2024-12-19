import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Tooltip } from '@mui/material';
import * as React from 'react';
import { validationType } from 'route/config/Verify';
import { StatusCodes } from 'http-status-codes';

const ConfigIcon = (toolTipTitle: string, icon: JSX.Element): JSX.Element => (
  <Tooltip
    title={toolTipTitle}
    PopperProps={{ container: document.getElementById('root') }}
  >
    {icon}
  </Tooltip>
);

export const getConfigIcon = (
  validation: validationType,
  label: string,
): JSX.Element => {
  let icon = <ErrorOutlineIcon color="error" data-testid="error-icon" />;
  let toolTipTitle = `${label} threw the following error: ${validation.error}`;
  const configHasStatus = validation.status !== undefined;
  const configHasError = validation.error !== undefined;
  if (!configHasError) {
    const statusMessage = configHasStatus
      ? `${validation.value} responded with status code ${validation.status}.`
      : '';
    const validationStatusIsOK =
      configHasStatus && validation.status! === StatusCodes.OK;
    icon =
      validationStatusIsOK || !configHasStatus ? (
        <CheckCircleIcon color="success" data-testid="success-icon" />
      ) : (
        <ErrorOutlineIcon color="warning" data-testid="warning-icon" />
      );
    toolTipTitle =
      validationStatusIsOK || !configHasStatus
        ? `${label} field is configured correctly.`
        : `${label} field may not be configured correctly.`;
    toolTipTitle += ` ${statusMessage}`;
  }
  return ConfigIcon(toolTipTitle, icon);
};

export const ConfigItem: React.FC<{
  label: string;
  value: string;
  validation?: validationType;
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
    <div id="config-text">
      <strong>{label}:</strong> {value}
    </div>
  </div>
);
ConfigItem.displayName = 'ConfigItem';