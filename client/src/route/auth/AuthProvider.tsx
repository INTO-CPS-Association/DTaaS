import { AuthProvider as OIDCAuthProvider } from 'react-oidc-context';
import { useOidcConfig } from 'util/auth/useOidcConfig';

interface AuthProviderProps {
  children: React.ReactNode;
}

/** What the provider appends on the way back, and nothing else. */
const CALLBACK_PARAMETERS = ['code', 'state', 'session_state', 'iss'];

/**
 * Clear the authorization code from the address bar once sign-in is done.
 *
 * The provider redirects back to the app with `?code=...&state=...` in the URL.
 * The token exchange has already happened by the time this runs, so the code
 * is spent, but left in the address bar it lingers in browser history and in
 * any server or proxy log that records the URL. Only the parameters the
 * provider added are removed, so a deep link keeps its page, its own query and
 * its hash.
 * This is not the token: the token never travels in the URL, it comes back on
 * the back-channel POST to the token endpoint.
 */
export function onSigninCallback(): void {
  const url = new URL(globalThis.location.href);
  CALLBACK_PARAMETERS.forEach((name) => url.searchParams.delete(name));

  // The current history state is carried over instead of replaced. React Router
  // keeps its own entry index there, and an empty object costs the index, and
  // with it scroll restoration and back-button handling until the next push
  // repairs it. Any remaining query and the hash are kept for the same reason
  // the path is: a redirect URI that carries its own parameters would otherwise
  // lose them here.
  globalThis.history.replaceState(
    globalThis.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  );
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const oidcConfig = useOidcConfig();
  if (!oidcConfig) {
    return <div>Authentication service unavailable...try again later</div>;
  }
  return (
    <OIDCAuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
      {children}
    </OIDCAuthProvider>
  );
};

export default AuthProvider;
