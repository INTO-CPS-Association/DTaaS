import { Paper, Typography } from '@mui/material';
import * as React from 'react';
import { z } from 'zod';
import { ConfigItem, windowEnvironmentVariables } from './ConfigItems';

const EnvironmentEnum = z.enum(['dev', 'local', 'prod', 'test']);
const PathString = z.string();
const ScopesString = z.literal('openid profile read_user read_repository api');

export type validationType = {
  value?: string;
  status?: number;
  error?: string;
};

async function opaqueRequest(url: string): Promise<validationType> {
  const urlValidation: validationType = {
    value: url,
    status: undefined,
    error: undefined,
  };
  try {
    await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    urlValidation.status = 0;
  } catch (error) {
    urlValidation.error = `An error occurred when fetching ${url}: ${error}`;
  }
  return urlValidation;
}

async function corsRequest(url: string): Promise<validationType> {
  const urlValidation: validationType = {
    value: url,
    status: undefined,
    error: undefined,
  };
  const response = await fetch(url, { method: 'HEAD' });
  const responseIsAcceptable = response.ok || response.status === 302;
  if (!responseIsAcceptable) {
    urlValidation.error = `Unexpected response code ${response.status} from ${url}.`;
  }
  urlValidation.status = response.status;
  return urlValidation;
}

async function urlIsReachable(url: string): Promise<validationType> {
  let urlValidation: validationType;
  try {
    urlValidation = await corsRequest(url);
  } catch {
    urlValidation = await opaqueRequest(url);
  }
  return urlValidation;
}

const parseField = (
  parser: {
    safeParse: (value: string) => {
      success: boolean;
      error?: { message?: string };
    };
  },
  value: string,
): validationType => {
  const result = parser.safeParse(value);
  return result.success
    ? { value, error: undefined }
    : { value: undefined, error: result.error?.message };
};

export const getValidationResults = async (): Promise<{
  [key: string]: validationType;
}> => {
  const results: { [key: string]: validationType } = {
    environment: parseField(EnvironmentEnum, window.env.REACT_APP_ENVIRONMENT),
    url: await urlIsReachable(window.env.REACT_APP_URL),
    url_basename: parseField(PathString, window.env.REACT_APP_URL_BASENAME),
    url_dtlink: parseField(PathString, window.env.REACT_APP_URL_DTLINK),
    url_liblink: parseField(PathString, window.env.REACT_APP_URL_LIBLINK),
    workbenchlink_vncdesktop: parseField(
      PathString,
      window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP,
    ),
    workbenchlink_vscode: parseField(
      PathString,
      window.env.REACT_APP_WORKBENCHLINK_VSCODE,
    ),
    workbenchlink_jupyterlab: parseField(
      PathString,
      window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB,
    ),
    workbenchlink_jupyternotebook: parseField(
      PathString,
      window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK,
    ),
    client_id: parseField(PathString, window.env.REACT_APP_CLIENT_ID),
    auth_authority: await urlIsReachable(window.env.REACT_APP_AUTH_AUTHORITY),
    redirect_uri: await urlIsReachable(window.env.REACT_APP_REDIRECT_URI),
    logout_redirect_uri: await urlIsReachable(
      window.env.REACT_APP_LOGOUT_REDIRECT_URI,
    ),
    gitlab_scopes: parseField(ScopesString, window.env.REACT_APP_GITLAB_SCOPES),
  };
  return results;
};

const VerifyConfig: React.FC<{ keys?: string[]; title?: string }> = ({
  keys = [],
  title = 'Config verification',
}) => {
  const [validationResults, setValidationResults] = React.useState<{
    [key: string]: validationType;
  }>({});

  React.useEffect(() => {
    const fetchValidations = async () => {
      const results = await getValidationResults();
      setValidationResults(results);
    };
    fetchValidations();
  }, []);

  const displayedConfigs = windowEnvironmentVariables.filter(
    (configItem) => keys.length === 0 || keys.includes(configItem.key),
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
      <Typography variant="h4">{title}</Typography>
      <div>
        {displayedConfigs.map(({ value, key }) => (
          <ConfigItem
            key={key}
            label={key.toUpperCase().split('_').join(' ')}
            value={value}
            validation={validationResults[key]}
          />
        ))}
      </div>
    </Paper>
  );
};

export default VerifyConfig;
