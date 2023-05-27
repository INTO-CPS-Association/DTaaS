import * as React from 'react';
import { useDispatch } from 'react-redux';
import { UserManager, User } from 'oidc-client-ts';
import { AuthProvider as OIDCAuthProvider } from 'react-oidc-context';
import { useOidcConfig } from '../../util/auth/useOidcConfig';
import { setUserName, clearUser } from '../../store/Redux/slices/auth.slice';

interface AuthProviderProps {
  children: React.ReactNode;
}


const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const oidcConfig = useOidcConfig();

  React.useEffect(() => {
    
    if (oidcConfig) {
      const userManager = new UserManager(oidcConfig)
      
      const onUserLoaded = (user: User) => {
        if (user.profile && user.profile.name) {
          dispatch(setUserName(user.profile.name));
        } else {
          throw new Error('User profile name was not available');
        }
      };
      

      const onUserUnloaded = () => {
        dispatch(clearUser());
      };

      userManager.events.addUserLoaded(onUserLoaded);
      userManager.events.addUserUnloaded(onUserUnloaded);
      
      return () => {
        userManager.events.removeUserLoaded(onUserLoaded);
        userManager.events.removeUserUnloaded(onUserUnloaded);
      }
    };
    return undefined;
  }, [dispatch, oidcConfig]);

  if (!oidcConfig) {
    return <div>Loading...</div>;
  }

  return <OIDCAuthProvider {...oidcConfig}>{children}</OIDCAuthProvider>;
};

export default AuthProvider;