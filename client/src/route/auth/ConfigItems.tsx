import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Tooltip } from '@mui/material';
import React from 'react';
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
  let icon = <ErrorOutlineIcon color="error" />;
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
        <CheckCircleIcon color="success" />
      ) : (
        <ErrorOutlineIcon color="warning" />
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
}> = React.memo(
  ({ label, value, validation = { error: 'Validating unavailable' } }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        margin: '5px 0',
      }}
    >
      {getConfigIcon(validation, label)}
      <div>
        <strong>{label}:</strong> {value}
      </div>
    </div>
  ),
);
ConfigItem.displayName = 'ConfigItem';

export const windowEnvironmentVariables: { value: string; key: string }[] = [
  {
    value: window.env.REACT_APP_ENVIRONMENT,
    key: 'environment',
  },
  {
    value: window.env.REACT_APP_URL,
    key: 'url',
  },
  {
    value: window.env.REACT_APP_URL_BASENAME,
    key: 'url_basename',
  },
  {
    value: window.env.REACT_APP_URL_DTLINK,
    key: 'url_dtlink',
  },
  {
    value: window.env.REACT_APP_URL_LIBLINK,
    key: 'url_liblink',
  },
  {
    value: window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP,
    key: 'workbenchlink_vncdesktop',
  },
  {
    value: window.env.REACT_APP_WORKBENCHLINK_VSCODE,
    key: 'workbenchlink_vscode',
  },
  {
    value: window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB,
    key: 'workbenchlink_jupyterlab',
  },
  {
    value: window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK,
    key: 'workbenchlink_jupyternotebook',
  },
  {
    value: window.env.REACT_APP_CLIENT_ID,
    key: 'client_id',
  },
  {
    value: window.env.REACT_APP_AUTH_AUTHORITY,
    key: 'auth_authority',
  },
  {
    value: window.env.REACT_APP_REDIRECT_URI,
    key: 'redirect_uri',
  },
  {
    value: window.env.REACT_APP_LOGOUT_REDIRECT_URI,
    key: 'logout_redirect_uri',
  },
  {
    value: window.env.REACT_APP_GITLAB_SCOPES,
    key: 'gitlab_scopes',
  },
];
