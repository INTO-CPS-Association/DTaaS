import { Paper, Tooltip, Typography } from '@mui/material';
import * as React from 'react';
import { z } from 'zod';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const EnvironmentEnum = z.enum(['dev', 'local', 'prod', 'test']);
const PathString = z.string();
const ScopesString = z.literal('openid profile read_user read_repository api');

type reachableUrlType = Promise<{
  url: string;
  status: number | undefined;
  error: string | undefined;
}>;
async function urlIsReachable(url: string): reachableUrlType {
  try {
    const response = await fetch(url, { method: 'HEAD' });

    if (response.ok || response.status === 302) {
      return { url, status: response.status, error: undefined };
    }
    return {
      url,
      status: response.status,
      error: `$Unexpected response code ${response.status} from ${url}.`,
    };
  } catch {
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      if (response.type === 'opaque') {
        return { url, status: response.status, error: undefined };
      }
      return {
        url,
        status: response.status,
        error: `$Unexpected response code ${response.status} from ${url}.`,
      };
    } catch (error) {
      return {
        url,
        status: undefined,
        error: `$An error occured when fetching ${url}. ${error}`,
      };
    }
  }
}

/* 
async function urlIsReachable(url: string): Promise<string> {
    const cleanURL = url.replace(/^https:\/\/(www.)?/, '').split('/')[0];
    try {
        console.log(`Checking ${url}`);
        const response = await fetch(cleanURL);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        if (response.ok || response.redirected) {
            console.log(`Checking succeeded for ${url}`);
            return cleanURL;
        }
        console.log(`Checking failed for ${url} code: ${response.status}`);
        throw new Error(`${cleanURL} responded with ${response.status}`);
    } catch (error) {
        console.log(`Checking failed for ${url}.`);
        throw new Error(
            `Error: Could not fetch ${cleanURL}. ${(error as Error).message}`,
        );
    }
} */

const VerifyConfig = () => {
  const [validationResults, setValidationResults] = React.useState<{
    [key: string]: boolean;
  }>({});
  const root = document.getElementById('root');

  React.useEffect(() => {
    const checkValidations = async () => {
      const results: { [key: string]: boolean } = {};
      results.environment = EnvironmentEnum.safeParse(
        window.env.REACT_APP_ENVIRONMENT,
      ).success;
      results.url = await urlIsReachable(window.env.REACT_APP_URL).then(
        (response) => !response.error,
      );
      results.url_basename = PathString.safeParse(
        window.env.REACT_APP_URL_BASENAME,
      ).success;
      results.url_dtlink = PathString.safeParse(
        window.env.REACT_APP_URL_DTLINK,
      ).success;
      results.url_liblink = PathString.safeParse(
        window.env.REACT_APP_URL_LIBLINK,
      ).success;
      results.workbenchlink_vncdesktop = PathString.safeParse(
        window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP,
      ).success;
      results.workbenchlink_vscode = PathString.safeParse(
        window.env.REACT_APP_WORKBENCHLINK_VSCODE,
      ).success;
      results.workbenchlink_jupyterlab = PathString.safeParse(
        window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB,
      ).success;
      results.workbenchlink_jupyternotebook = PathString.safeParse(
        window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK,
      ).success;
      results.client_id = PathString.safeParse(
        window.env.REACT_APP_CLIENT_ID,
      ).success;
      results.auth_authority = await urlIsReachable(
        window.env.REACT_APP_AUTH_AUTHORITY,
      ).then((response) => !response.error);
      results.redirect_uri = await urlIsReachable(
        window.env.REACT_APP_REDIRECT_URI,
      ).then((response) => !response.error);
      results.logout_redirect_uri = await urlIsReachable(
        window.env.REACT_APP_LOGOUT_REDIRECT_URI,
      ).then((response) => !response.error);
      results.gitlab_scopes = ScopesString.safeParse(
        window.env.REACT_APP_GITLAB_SCOPES,
      ).success;
      setValidationResults(results);
    };

    checkValidations();
  }, []);

  const ConfigItem = ({
    label,
    value,
    isValid,
  }: {
    label: string;
    value: string;
    isValid?: boolean;
  }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        margin: '5px 0',
      }}
    >
      {isValid !== undefined &&
        (isValid ? (
          <Tooltip
            title={`${label} is configured correctly.`}
            PopperProps={{ container: root }}
          >
            <CheckCircleIcon color="success" />
          </Tooltip>
        ) : (
          <Tooltip title="Error!" PopperProps={{ container: root }}>
            <ErrorOutlineIcon color="error" />
          </Tooltip>
        ))}
      <div>
        <strong>{label}:</strong> {value}
      </div>
    </div>
  );

  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <Typography variant="h4">Configuration Verification</Typography>
      <div>
        <ConfigItem
          label="APP ENVIRONMENT"
          value={window.env.REACT_APP_ENVIRONMENT}
          isValid={validationResults.environment}
        />
        <ConfigItem
          label="APP URL"
          value={window.env.REACT_APP_URL}
          isValid={validationResults.url}
        />
        <ConfigItem
          label="APP URL BASENAME"
          value={window.env.REACT_APP_URL_BASENAME}
          isValid={validationResults.url_basename}
        />
        <ConfigItem
          label="APP URL DTLINK"
          value={window.env.REACT_APP_URL_DTLINK}
          isValid={validationResults.url_dtlink}
        />
        <ConfigItem
          label="APP URL LIBLINK"
          value={window.env.REACT_APP_URL_LIBLINK}
          isValid={validationResults.url_liblink}
        />
        <ConfigItem
          label="WORKBENCHLINK VNCDESKTOP"
          value={window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP}
          isValid={validationResults.workbenchlink_vncdesktop}
        />
        <ConfigItem
          label="WORKBENCHLINK VSCODE"
          value={window.env.REACT_APP_WORKBENCHLINK_VSCODE}
          isValid={validationResults.workbenchlink_vscode}
        />
        <ConfigItem
          label="WORKBENCHLINK JUPYTERLAB"
          value={window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB}
          isValid={validationResults.workbenchlink_jupyterlab}
        />
        <ConfigItem
          label="WORKBENCHLINK JUPYTERNOTEBOOK"
          value={window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK}
          isValid={validationResults.workbenchlink_jupyternotebook}
        />
        <ConfigItem
          label="CLIENT ID"
          value={window.env.REACT_APP_CLIENT_ID}
          isValid={validationResults.client_id}
        />
        <ConfigItem
          label="AUTH AUTHORITY"
          value={window.env.REACT_APP_AUTH_AUTHORITY}
          isValid={validationResults.auth_authority}
        />
        <ConfigItem
          label="REDIRECT URI"
          value={window.env.REACT_APP_REDIRECT_URI}
          isValid={validationResults.redirect_uri}
        />
        <ConfigItem
          label="LOGOUT REDIRECT URI"
          value={window.env.REACT_APP_LOGOUT_REDIRECT_URI}
          isValid={validationResults.logout_redirect_uri}
        />
        <ConfigItem
          label="GITLAB SCOPES"
          value={window.env.REACT_APP_GITLAB_SCOPES}
          isValid={validationResults.gitlab_scopes}
        />
      </div>
    </Paper>
  );
};

export default VerifyConfig;
