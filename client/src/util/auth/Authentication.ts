import { User } from 'oidc-client-ts';

export interface CustomAuthContext {
  signoutRedirect: () => Promise<void>;
  user?: User | null | undefined;
}

export async function signOut(auth: CustomAuthContext) {
  localStorage.clear();
  sessionStorage.clear();
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
