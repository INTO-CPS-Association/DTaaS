import { cleanup, render, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from 'AppProvider';
import routes from 'routes';
import { useAuth } from 'react-oidc-context';
import store from 'store/store';
import { configureStore } from '@reduxjs/toolkit';
import digitalTwinReducer from 'model/backend/state/digitalTwin.slice';
import snackbarSlice from 'store/snackbar.slice';
import { mockAuthState, mockAuthStateType } from 'test/__mocks__/global_mocks';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import executionHistoryReducer, {
  addExecutionHistoryEntry,
} from 'model/backend/state/executionHistory.slice';

export const dispatchAddExecHistoryEntry = async (
  customStore: ReturnType<typeof configureStore>,
  overrides = {},
) => {
  const defaultExecutionHistoryEntry = {
    id: '1',
    dtName: 'test-asset',
    pipelineId: 123,
    timestamp: Date.now(),
    status: ExecutionStatus.COMPLETED,
    jobLogs: [],
  };
  await act(async () => {
    customStore.dispatch(
      addExecutionHistoryEntry({
        ...defaultExecutionHistoryEntry,
        ...overrides,
      }),
    );
  });
};

export const storeResetAll = () => store.dispatch({ type: 'RESET_ALL' });

export const previewStore = configureStore({
  reducer: {
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
    executionHistory: executionHistoryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

const renderWithAppProvider = (route: string) => {
  globalThis.history.pushState({}, 'Test page', route);
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
