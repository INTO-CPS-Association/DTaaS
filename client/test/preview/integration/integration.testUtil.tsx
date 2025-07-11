import { cleanup, render, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from 'AppProvider';
import routes from 'routes';
import * as React from 'react';
import { useAuth } from 'react-oidc-context';
import store from 'store/store';
import { configureStore } from '@reduxjs/toolkit';
import digitalTwinReducer from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import { mockAuthState, mockAuthStateType } from 'test/__mocks__/global_mocks';

export const previewStore = configureStore({
  reducer: {
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

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

async function setupIntegrationTest(
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

export default setupIntegrationTest;
