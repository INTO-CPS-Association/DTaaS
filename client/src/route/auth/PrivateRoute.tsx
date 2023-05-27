import * as React from 'react';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import WaitNavigateAndReload from './WaitAndNavigate';

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const auth = useAuth();
  const [isInitialFetchDone, setIsInitialFetchDone] = React.useState(false);
  let returnJSX;

  React.useEffect(() => {
    if (auth.isAuthenticated && !isInitialFetchDone) {
      if (auth.user !== null && auth.user !== undefined) {
        localStorage.setItem('username', auth.user.profile.profile ?? '');
        localStorage.setItem('access_token', auth.user.access_token);
        sessionStorage.setItem('username', auth.user.profile.profile ?? '');
        sessionStorage.setItem('access_token', auth.user.access_token);
        setIsInitialFetchDone(true);
      }
      else
      {
        throw new Error('Username was not available');
      }
    }
  }, [auth.isAuthenticated, isInitialFetchDone]);

  if (auth.isLoading) {
    returnJSX = <div>Loading...</div>;
  } else if (auth.error) {
    returnJSX = (
      <div>
        Oops... {auth.error.message}
        <WaitNavigateAndReload />
      </div>
    );
  } else if (!auth.isAuthenticated) {
    returnJSX = <Navigate to="/" replace />;
  } else if (auth.isAuthenticated) {
    returnJSX = <>{children}</>;
  } else {
    returnJSX = <Navigate to="/" replace />;
  }

  return returnJSX;
};

export default PrivateRoute;
