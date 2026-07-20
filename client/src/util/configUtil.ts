import { z } from 'zod';
import { wait } from 'util/auth/Authentication';

export interface ValidationType {
  value?: string;
  status?: number;
  error?: string;
}

const EnvironmentEnum = z.enum(['dev', 'local', 'prod', 'test']);
const PathString: z.ZodString = z.string();
const ScopesString: z.ZodLiteral<string> = z.literal(
  'openid profile read_user read_repository api',
);

const pathKeys = [
  'REACT_APP_URL_BASENAME',
  'REACT_APP_URL_DTLINK',
  'REACT_APP_URL_LIBLINK',
  'REACT_APP_CLIENT_ID',
  'REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW',
  'REACT_APP_WORKBENCHLINK_DT_PREVIEW',
];

const urlKeys = [
  'REACT_APP_URL',
  'REACT_APP_REDIRECT_URI',
  'REACT_APP_LOGOUT_REDIRECT_URI',
  'REACT_APP_AUTH_AUTHORITY',
  'LOGGER_URL',
];

const isConfiguredKey = (key: string): boolean =>
  key === 'LOGGER_URL' ? Boolean(globalThis.env.LOGGER_URL?.trim()) : true;

const configuredKeys = (keys: string[]) => keys.filter(isConfiguredKey);

function getValidationPromises(): Record<string, Promise<ValidationType>> {
  return {
    REACT_APP_ENVIRONMENT: Promise.resolve(
      parseField(EnvironmentEnum, globalThis.env.REACT_APP_ENVIRONMENT),
    ),
    REACT_APP_GITLAB_SCOPES: Promise.resolve(
      parseField(ScopesString, globalThis.env.REACT_APP_GITLAB_SCOPES),
    ),
    ...Object.fromEntries(
      configuredKeys(pathKeys).map((key) => [
        key,
        parseField(PathString, globalThis.env[key] ?? ''),
      ]),
    ),
    ...Object.fromEntries(
      configuredKeys(urlKeys).map((key) => [
        key,
        urlIsReachable(globalThis.env[key] ?? ''),
      ]),
    ),
  };
}

export const getValidationResults = async (): Promise<
  Record<string, ValidationType>
> => {
  const validationPromises: Record<
    string,
    Promise<ValidationType>
  > = getValidationPromises();
  const entries = Object.entries(validationPromises);
  const resolvedEntries = await Promise.all(
    entries.map(
      async ([key, promise]) =>
        [key, await promise] as [string, ValidationType],
    ),
  );
  return Object.fromEntries(resolvedEntries);
};

export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retries = 2,
): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await wait(1000);
    return retryFetch(url, options, retries - 1);
  }
}

async function corsRequest(url: string): Promise<ValidationType | null> {
  const urlValidation: ValidationType = {
    value: undefined,
    status: undefined,
    error: undefined,
  };
  try {
    const response = await retryFetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
      headers: {
        Accept: '*/*',
        Origin: globalThis.location.origin,
      },
      redirect: 'manual',
    });
    const responseIsAcceptable = response.ok || response.redirected;
    if (responseIsAcceptable) {
      urlValidation.value = url;
      urlValidation.status = response.status;
    }
  } catch (_error) {
    return null;
  }
  return urlValidation;
}

async function opaqueRequest(url: string): Promise<ValidationType | null> {
  const urlValidation: ValidationType = {
    value: undefined,
    status: undefined,
    error: undefined,
  };
  try {
    await retryFetch(url, {
      method: 'GET',
      mode: 'no-cors',
      signal: AbortSignal.timeout(2000),
    });
    urlValidation.value = url;
    urlValidation.status = 0;
  } catch (_error) {
    return null;
  }
  return urlValidation;
}

export async function urlIsReachable(url: string): Promise<ValidationType> {
  if (!url.trim()) {
    return {
      value: undefined,
      status: undefined,
      error: 'Required URL is missing.',
    };
  }

  return (
    (await corsRequest(url)) ??
    (await opaqueRequest(url)) ?? {
      value: undefined,
      status: undefined,
      error: `Failed to fetch ${url} after multiple attempts.`,
    }
  );
}

const parseField = (
  parser: {
    safeParse: (value: string) => {
      success: boolean;
      error?: { message?: string };
    };
  },
  value: string,
): ValidationType => {
  const result = parser.safeParse(value);
  return result.success
    ? { error: undefined, value, status: undefined }
    : { error: result.error?.message, status: undefined, value: undefined };
};
