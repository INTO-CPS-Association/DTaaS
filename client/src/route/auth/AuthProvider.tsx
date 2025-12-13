import { AuthProvider as OIDCAuthProvider } from 'react-oidc-context';
import { useOidcConfig } from 'util/auth/useOidcConfig';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const oidcConfig = useOidcConfig();
  if (!oidcConfig) {
    return <div>Authentication service unavailable...try again later</div>;
  }
  return <OIDCAuthProvider {...oidcConfig}>{children}</OIDCAuthProvider>;
};

export default AuthProvider;
