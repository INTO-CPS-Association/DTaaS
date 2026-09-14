import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import ExecutionHistoryLoader from 'components/execution/ExecutionHistoryLoader';
import WaitNavigateAndReload from 'route/auth/WaitAndNavigate';
import { useLogger } from 'util/logger/useLogger';
import { setAccessToken } from 'util/auth/accessToken';

interface PrivateRouteProps {
  children: ReactNode;
}

type RouteState = 'loading' | 'error' | 'unauthenticated' | 'authenticated';

function getRouteState(auth: ReturnType<typeof useAuth>): RouteState {
  const states: Array<[() => boolean, RouteState]> = [
    [() => auth.isLoading, 'loading'],
    [() => Boolean(auth.error), 'error'],
    [() => !auth.isAuthenticated, 'unauthenticated'],
  ];
  return states.find(([matches]) => matches())?.[1] ?? 'authenticated';
}

function storeAccessToken(
  isAuthenticated: boolean,
  user: ReturnType<typeof useAuth>['user'],
): void {
  if (!isAuthenticated) return;
  if (!user) throw new Error('Access token was not available...');
  setAccessToken(user.access_token);
}

function renderRouteState(
  routeState: RouteState,
  error: { message: string } | undefined,
  children: ReactNode,
): ReactNode {
  const views: Record<RouteState, ReactNode> = {
    loading: <div>Loading...</div>,
    error: (
      <div>
        Oops... {error?.message}
        <WaitNavigateAndReload />
      </div>
    ),
    unauthenticated: <Navigate to="/" replace />,
    authenticated: (
      <>
        {children}
        <ExecutionHistoryLoader />
      </>
    ),
  };
  return views[routeState];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const auth = useAuth();
  useLogger();

  // During render and not in an effect. An effect runs after the children,
  // and a child that fetches on mount would find no token on the first render
  // after a reload. Assigning a module variable has no other consequence.
  storeAccessToken(auth.isAuthenticated, auth.user);

  const routeState = getRouteState(auth);
  return renderRouteState(routeState, auth.error, children);
};

export default PrivateRoute;
