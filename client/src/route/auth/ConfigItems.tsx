import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Tooltip } from '@mui/material';
import * as React from 'react';
import { validationType } from './VerifyConfig';

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
      configHasStatus &&
      ((validation.status! >= 200 && validation.status! <= 299) ||
        validation.status! === 302);
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

export const windowEnvironmentVariables: Record<string, string> = {
  environment: window.env.REACT_APP_ENVIRONMENT,
  url: window.env.REACT_APP_URL,
  url_basename: window.env.REACT_APP_URL_BASENAME,
  url_dtlink: window.env.REACT_APP_URL_DTLINK,
  url_liblink: window.env.REACT_APP_URL_LIBLINK,
  workbenchlink_vncdesktop: window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP,
  workbenchlink_vscode: window.env.REACT_APP_WORKBENCHLINK_VSCODE,
  workbenchlink_jupyterlab: window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB,
  workbenchlink_jupyternotebook:
    window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK,
  client_id: window.env.REACT_APP_CLIENT_ID,
  auth_authority: window.env.REACT_APP_AUTH_AUTHORITY,
  redirect_uri: window.env.REACT_APP_REDIRECT_URI,
  logout_redirect_uri: window.env.REACT_APP_LOGOUT_REDIRECT_URI,
  gitlab_scopes: window.env.REACT_APP_GITLAB_SCOPES,
};
