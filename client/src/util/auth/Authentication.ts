import { User } from 'oidc-client-ts';
import {
  getLogoutRedirectURI,
} from '../envUtil';

export interface CustomAuthContext {
  signoutRedirect: () => Promise<void>;
  removeUser: () => Promise<void>;
  user?: User | null | undefined;
}

export async function signOut(auth: CustomAuthContext) {
  localStorage.clear();
  sessionStorage.clear();

  if(auth.user) {
    await auth.removeUser();
  }

  const gitlabSignOutUrl = 'https://gitlab.com/users/sign_out';
  const postLogoutRedirectUrl = encodeURIComponent(getLogoutRedirectURI() ?? '');
  window.location.href = `${gitlabSignOutUrl}?redirect_to=${postLogoutRedirectUrl}`;
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const onTimeout = () => {
      resolve();
    };
    setTimeout(onTimeout, milliseconds);
  });
}
