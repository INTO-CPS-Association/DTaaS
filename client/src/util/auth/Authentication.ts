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
  const accessToken = sessionStorage.getItem('access_token');
  const gitLabUrl = getAuthority();

  if (accessToken) {
    const response = await fetch(`${gitLabUrl}/oauth/token/revoke`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
        throw new Error('Sign out failed...');
    }
  }

  localStorage.clear();
  sessionStorage.clear();

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
