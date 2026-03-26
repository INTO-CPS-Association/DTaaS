import { useSelector } from 'react-redux';
import { RootState } from 'store/store';

/**
 * @param url or endpoint to clean
 * @returns a `string` with no whitespaces, leading or trailing slashes
 */
export function cleanURL(url: string): string {
  return url?.trim().replace(/^\/|\/$/g, ''); // Remove leading and trailing slashes
}

/**
 * Injects the `username` into the `baseURL` and `endpoint` to create a link.
 * @param baseURL Example `https://foo.com` Any leading or trailing slashes will be removed.
 * @param endpoint (optional). Example `bar` Any leading or trailing slashes will be removed.
 * @returns a complete URL: `baseUrl` / `username` / `endpoint`
 */
const useUserLink = (baseURL: string, endpoint?: string): string => {
  const username = useSelector((state: RootState) => state.auth).userName;
  const cleanBaseURL = cleanURL(baseURL);
  const cleanEndpoint = cleanURL(endpoint ?? '');
  return `${cleanBaseURL}/${username}/${cleanEndpoint}`;
};

export function useURLforDT(): string {
  return useUserLink(useAppURL(), window.env.REACT_APP_URL_DTLINK);
}

export function useURLbasename(): string {
  return cleanURL(window.env.REACT_APP_URL_BASENAME);
}

export function useURLforLIB(): string {
  return useUserLink(useAppURL(), window.env.REACT_APP_URL_LIBLINK);
}

export function useAppURL(): string {
  return `${cleanURL(window.env.REACT_APP_URL)}/${useURLbasename()}`;
}

export interface KeyLinkPair {
  key: string;
  link: string;
}

/**
 * Pure function to build a user-scoped link from a pre-fetched username.
 * Does not call any React hooks, safe to use inside loops.
 */
function buildUserLink(
  username: string,
  baseURL: string,
  endpoint?: string,
): string {
  const cleanBaseURL = cleanURL(baseURL);
  const cleanEndpoint = cleanURL(endpoint ?? '');
  return `${cleanBaseURL}/${username}/${cleanEndpoint}`;
}

/**
 * @returns an array of `KeyLinkPair` objects, where each object contains a `key` and a `link`.
 *
 * Workspace tool links (Desktop, VS Code, Jupyter Lab, Jupyter Notebook) are derived from the
 * services JSON fetched from `{appURL}/{username}/services` and stored in the Redux store.
 *
 * Preview links (LIBRARY_PREVIEW, DT_PREVIEW) continue to be read from environment variables.
 */
export function useWorkbenchLinkValues(): KeyLinkPair[] {
  const username = useSelector((state: RootState) => state.auth).userName ?? '';
  const services = useSelector((state: RootState) => state.workbench.services);
  const appURL = useAppURL();
  const workbenchLinkValues: KeyLinkPair[] = [];

  const serviceKeyMap: Record<string, string> = {
    desktop: 'VNCDESKTOP',
    vscode: 'VSCODE',
    lab: 'JUPYTERLAB',
    notebook: 'JUPYTERNOTEBOOK',
  };

  Object.entries(serviceKeyMap).forEach(([serviceKey, iconKey]) => {
    const service = services[serviceKey];
    if (service !== undefined) {
      workbenchLinkValues.push({
        key: iconKey,
        link: buildUserLink(username, appURL, service.endpoint),
      });
    }
  });

  const prefix = 'REACT_APP_WORKBENCHLINK_';
  Object.keys(window.env)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => {
      const value = window.env[key];
      if (value !== undefined) {
        const keyWithoutPrefix = key.slice(prefix.length);
        if (
          keyWithoutPrefix === 'DT_PREVIEW' ||
          keyWithoutPrefix === 'LIBRARY_PREVIEW'
        ) {
          workbenchLinkValues.push({
            key: keyWithoutPrefix,
            link: value,
          });
        }
      }
    });

  return workbenchLinkValues;
}

export function useGetDTPagePreviewLink(): string {
  return useUserLink(useAppURL(), 'preview/digitaltwins');
}

export function getClientID(): string {
  return window.env.REACT_APP_CLIENT_ID;
}

export function getAuthority(): string {
  return window.env.REACT_APP_AUTH_AUTHORITY;
}

export function getRedirectURI(): string {
  return window.env.REACT_APP_REDIRECT_URI;
}

export function getLogoutRedirectURI(): string {
  return window.env.REACT_APP_LOGOUT_REDIRECT_URI;
}

export function getGitLabScopes(): string {
  return window.env.REACT_APP_GITLAB_SCOPES;
}
