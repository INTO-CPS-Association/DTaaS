import { cleanup, render, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from 'AppProvider';
import routes from 'routes';
import * as React from 'react';
import { mockAuthState, mockAuthStateType } from '../__mocks__/global_mocks';
import { useAuth } from 'react-oidc-context';
import store from 'store/store';

const renderWithAppProvider = (route: string) => {
  window.history.pushState({}, 'Test page', route);
  return render(
    AppProvider({
      children: (
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            {routes.map((routeElement) => (
              <Route
                path={routeElement.path}
                element={routeElement.element}
                key={`route-${routeElement.path.slice(1, -1)}`}
              />
            ))}
            ;
          </Routes>
        </MemoryRouter>
      ),
    }),
  );
};

export async function setupIntegrationTest(
  route: string,
  authState?: mockAuthStateType,
) {
  cleanup();
  const returnedAuthState = authState ?? mockAuthState;

  (useAuth as jest.Mock).mockReturnValue({
    ...returnedAuthState,
  });

  if (returnedAuthState.isAuthenticated) {
    store.dispatch({
      type: 'auth/setUserName',
      payload: returnedAuthState.user!.profile.profile!.split('/')[1],
    });
  } else {
    store.dispatch({ type: 'auth/setUserName', payload: undefined });
  }
  const container = await act(async () => renderWithAppProvider(route));
  return container;
}
