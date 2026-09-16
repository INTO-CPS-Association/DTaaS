import { AuthProvider as OIDCAuthProvider } from 'react-oidc-context';
import { useOidcConfig } from 'util/auth/useOidcConfig';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Clear the authorization code from the address bar once sign-in is done.
 *
 * The provider redirects back to the app with `?code=...&state=...` in the URL.
 * The token exchange has already happened by the time this runs, so the code
 * is spent, but left in the address bar it lingers in browser history and in
 * any server or proxy log that records the URL. Replacing the entry with the
 * bare path removes it while keeping the page, so a deep link still resolves.
 * This is not the token: the token never travels in the URL, it comes back on
 * the back-channel POST to the token endpoint.
 */
export function onSigninCallback(): void {
  globalThis.history.replaceState(
    {},
    document.title,
    globalThis.location.pathname,
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
