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
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: AbortSignal.timeout(1000),
    });
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
  const response = await fetch(url, {
    method: 'HEAD',
    signal: AbortSignal.timeout(1000),
  });
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

export const getValidationResults = async (
  keysToValidate: string[],
): Promise<{
  [key: string]: validationType;
}> => {
  const allVerifications = {
    environment: Promise.resolve(
      parseField(EnvironmentEnum, window.env.REACT_APP_ENVIRONMENT),
    ),
    url: urlIsReachable(window.env.REACT_APP_URL),
    url_basename: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_URL_BASENAME),
    ),
    url_dtlink: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_URL_DTLINK),
    ),
    url_liblink: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_URL_LIBLINK),
    ),
    workbenchlink_vncdesktop: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP),
    ),
    workbenchlink_vscode: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_VSCODE),
    ),
    workbenchlink_jupyterlab: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB),
    ),
    workbenchlink_jupyternotebook: Promise.resolve(
      parseField(
        PathString,
        window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK,
      ),
    ),
    client_id: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_CLIENT_ID),
    ),
    auth_authority: urlIsReachable(window.env.REACT_APP_AUTH_AUTHORITY),
    redirect_uri: urlIsReachable(window.env.REACT_APP_REDIRECT_URI),
    logout_redirect_uri: urlIsReachable(
      window.env.REACT_APP_LOGOUT_REDIRECT_URI,
    ),
    gitlab_scopes: Promise.resolve(
      parseField(ScopesString, window.env.REACT_APP_GITLAB_SCOPES),
    ),
  };

  const verifications =
    keysToValidate.length === 0
      ? allVerifications
      : Object.fromEntries(
          keysToValidate
            .filter((key) => key in allVerifications)
            .map((key) => [
              key,
              allVerifications[key as keyof typeof allVerifications],
            ]),
        );

  const results = await Promise.all(
    Object.entries(verifications).map(async ([key, task]) => ({
      [key]: await task,
    })),
  );

  return results.reduce((acc, result) => ({ ...acc, ...result }), {});
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
      const results = await getValidationResults(keys);
      setValidationResults(results);
    };
    fetchValidations();
  }, []);

  const displayedConfigs: Record<string, string> =
    keys.length === 0
      ? windowEnvironmentVariables
      : Object.fromEntries(
          keys
            .filter((key) => key in windowEnvironmentVariables)
            .map((key) => [
              key,
              windowEnvironmentVariables[
                key as keyof typeof windowEnvironmentVariables
              ] as string,
            ]),
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
      <div id="config-items">
        {Object.entries(displayedConfigs).map(([key, value]) => (
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
