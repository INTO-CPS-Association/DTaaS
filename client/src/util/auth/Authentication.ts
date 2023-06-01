import { User } from 'oidc-client-ts';
import {
  getAuthority,
} from '../envUtil';

export interface CustomAuthContext {
  signoutRedirect: () => Promise<void>;
  removeUser: () => Promise<void>;
  user?: User | null | undefined;
}

export async function signOut(auth: CustomAuthContext) {
  localStorage.clear();
  sessionStorage.clear();
  const AUTH_AUTHORITY = getAuthority() ?? '';

  // Clear cookies
  const allCookies = document.cookie.split(';');

  // Iterate over all cookies and delete them
  for (let i = 0; i < allCookies.length; i+=1) {
    document.cookie = `${allCookies[i]  }=;expires=${  new Date(0).toUTCString()  }; path=${AUTH_AUTHORITY.toString()}`;
  }

  if(auth.user) {
    await auth.removeUser();
  }

  await auth.signoutRedirect();
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const onTimeout = () => {
      resolve();
    };
    setTimeout(onTimeout, milliseconds);
  });
}
