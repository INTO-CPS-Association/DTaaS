import { useSelector } from 'react-redux';
import { RootState } from 'store/store';

/**
 * @param url or endpoint to clean
 * @returns a `string` with no whitespaces, leading or trailing slashes
 */
export function cleanURL(url: string): string {
  return url?.trim().replace(/^\/|\/$/g, ''); // Remove leading and trailing slashes
}

const constructUserLink = (baseURL: string, endpoint?: string): string => {
  const username = useSelector((state: RootState) => state.auth).userName;
  const cleanBaseURL = cleanURL(baseURL);
  const cleanEndpoint = cleanURL(endpoint ?? '');
  return `${cleanBaseURL}/${username}/${cleanEndpoint}`;
};

export function getURLforDT(): string {
  return constructUserLink(getAppURL(), window.env.REACT_APP_URL_DTLINK);
}

export function getURLbasename(): string {
  return cleanURL(window.env.REACT_APP_URL_BASENAME);
}

export function getURLforLIB(): string {
  return constructUserLink(getAppURL(), window.env.REACT_APP_URL_LIBLINK);
}

function getAppURL(): string {
  return `${cleanURL(window.env.REACT_APP_URL)}/${getURLbasename()}`;
}

export interface KeyLinkPair {
  key: string;
  link: string;
}

/**
 * @returns an array of `KeyLinkPair` objects, where each object contains a `key` and a `link`.
 *
 * The `key` is the `key` of the environment variable, with the prefix *"REACT_APP_WORKBENCHLINK_"* removed.
 * For example, if the `key` of the environment variable is *"REACT_APP_WORKBENCHLINK_MYWORKBENCH"*, then the `key` will be *"MYWORKBENCH"*.
 *
 * The `link` is constructed by appending the `username` to the end of the *REACT_APP_URL_WORKBENCH*, and then appending the value of the environment variable to the end of that.
 * For example, if the *REACT_APP_URL_WORKBENCH* is https://foo.com, the `username` is *"user1"*, and the value of the environment variable is "/my-workbench", then the link will be https://foo.com/user1/my-workbench.
 */
export function getWorkbenchLinkValues(): KeyLinkPair[] {
  const prefix = 'REACT_APP_WORKBENCHLINK_';
  const workbenchLinkValues: KeyLinkPair[] = [];

  Object.keys(window.env)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => {
      const value = window.env[key];
      if (value !== undefined) {
        const keyWithoutPrefix = key.slice(prefix.length);
        workbenchLinkValues.push({
          key: keyWithoutPrefix,
          link: constructUserLink(getAppURL(), value),
        });
      }
    });

  return workbenchLinkValues;
}
