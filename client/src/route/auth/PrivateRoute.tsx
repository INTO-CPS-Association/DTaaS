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
  React.useEffect(() => {
    if (auth.isAuthenticated && !isInitialFetchDone) {
      if (auth.user !== null && auth.user !== undefined) {
        localStorage.setItem('username', auth.user.profile.profile ?? '');
        localStorage.setItem('access_token', auth.user.access_token);
        setIsInitialFetchDone(true);
      }
    }
  }, [auth.isAuthenticated, isInitialFetchDone]);

  if (auth.isLoading) {
    return <div>Loading auth...</div>;
  }

  if (auth.error) {
    return (
      <div>
        Oops... {auth.error.message}
        <WaitNavigateAndReload />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (auth.isAuthenticated) {
    return <>{children}</>;
  }

  return <Navigate to="/" replace />;
};

export default PrivateRoute;
