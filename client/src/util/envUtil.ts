import { useSelector } from 'react-redux';
import { useAuth } from 'react-oidc-context';
import { RootState } from 'store/store';
import { resolveOAuthUsername } from 'util/auth/oauthUserProfile';

/**
 * @param url or endpoint to clean
 * @returns a `string` with no whitespaces, leading or trailing slashes
 */
export function cleanURL(url: string): string {
  return url?.trim().replace(/^\/|\/$/g, ''); // Remove leading and trailing slashes
}

export function cleanUsername(username: string | undefined): string {
  return username?.trim().toLowerCase() ?? '';
}

/**
 * The signed-in user's name, as every workspace address needs it.
 *
 * PrivateRoute records the name in the store in an effect, and an effect runs
 * after the page has rendered once. Read from the store alone, the first render
 * of a page opened directly builds an address with no name in it, such as
 * //lab, and an embedded frame loads that address before the right one. The
 * OIDC profile already holds the name on that first render, so it is read
 * from there when the store has none yet.
 */
export function useUsername(): string {
  const stored = useSelector((state: RootState) => state.auth).userName;
  const auth = useAuth();
  const fromProfile = auth?.user
    ? resolveOAuthUsername(auth.user.profile)
    : undefined;
  return cleanUsername(stored || fromProfile);
}

/**
 * Injects the `username` into the `baseURL` and `endpoint` to create a link.
 * @param baseURL Example `https://intocps.org` Any leading or trailing slashes will be removed.
 * @param endpoint (optional). Example `bar` Any leading or trailing slashes will be removed.
 * @returns a complete URL: `baseUrl` / `username` / `endpoint`
 */
const useUserLink = (baseURL: string, endpoint?: string): string => {
  const username = useUsername();
  const cleanBaseURL = cleanURL(baseURL);
  const cleanEndpoint = cleanURL(endpoint ?? '');
  return `${cleanBaseURL}/${username}/${cleanEndpoint}`;
};

export function useURLforDT(): string {
  return useUserLink(useAppURL(), globalThis.env.REACT_APP_URL_DTLINK);
}

export function useURLbasename(): string {
  return cleanURL(globalThis.env.REACT_APP_URL_BASENAME);
}

export function useURLforLIB(): string {
  return useUserLink(useAppURL(), globalThis.env.REACT_APP_URL_LIBLINK);
}

export function useAppURL(): string {
  return `${cleanURL(globalThis.env.REACT_APP_URL)}/${useURLbasename()}`;
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
  return `${cleanBaseURL}/${cleanUsername(username)}/${cleanEndpoint}`;
}

/**
 * @returns an array of `KeyLinkPair` objects, where each object contains a `key` and a `link`.
 *
 * Workspace tool links (Desktop, VS Code, Jupyter Lab, Jupyter Notebook) are derived from the
 * services JSON fetched from `{appURL}/{username}/services` and stored in the Redux store.
 *
 * The library and digital twins previews are no longer workbench links: they
 * are pages of this application, reached from the Automation page instead.
 */
export function useWorkbenchLinkValues(): KeyLinkPair[] {
  const username = useUsername();
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

  return workbenchLinkValues;
}

export function useGetDTPagePreviewLink(): string {
  return useUserLink(useAppURL(), 'preview/digitaltwins');
}

export function getClientID(): string {
  return globalThis.env.REACT_APP_CLIENT_ID;
}

export { default as getAuthority } from 'model/backend/util/env';

export function getRedirectURI(): string {
  return globalThis.env.REACT_APP_REDIRECT_URI;
}

export function getLogoutRedirectURI(): string {
  return globalThis.env.REACT_APP_LOGOUT_REDIRECT_URI;
}

export function getGitLabScopes(): string {
  return globalThis.env.REACT_APP_GITLAB_SCOPES;
}
