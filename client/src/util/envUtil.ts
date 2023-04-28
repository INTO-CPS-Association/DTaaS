import { useSelector } from 'react-redux';
import { RootState } from 'store/store';

const constructUserLink = (baseURL: string, endpoint: string): string => {
  const userState = useSelector((state: RootState) => state.auth);
  const cleanBaseRL = baseURL.trim().endsWith('/') ? baseURL : `${baseURL}/`;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBaseRL}${userState.userName}${cleanEndpoint}`;
};

export function getURLforDT(): string {
  return window.env.REACT_APP_URL_DT;
}

export function getURLforLIB(): string {
  return window.env.REACT_APP_URL_LIB;
}

export function getURLforWorkbench(): string {
  return window.env.REACT_APP_URL_WORKBENCH;
}

export interface KeyLinkPair {
  key: string;
  link: string;
}

/**
 *
 * @returns an array of KeyLinkPair objects, where each object contains a key and a link.
 * The key is the key of the environment variable, and the link is the value of the environment variable.
 * The link is constructed by appending the user name to the end of the URL for the workbench, and then appending the value of the environment variable to the end of that.
 * For example, if the URL for the workbench is https://workbench.example.com, the user name is "user1", and the value of the environment variable is "/my-workbench", then the link will be https://workbench.example.com/user1/my-workbench.
 * The key is the key of the environment variable, with the prefix "REACT_APP_WORKBENCHLINK_" removed.
 * For example, if the key of the environment variable is "REACT_APP_WORKBENCHLINK_MYWORKBENCH", then the key will be "MYWORKBENCH".
 * The environment variables that are used to construct the links must start with "REACT_APP_WORKBENCHLINK_".
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
          link: constructUserLink(getURLforWorkbench(), value),
        });
      }
    });

  return workbenchLinkValues;
}
