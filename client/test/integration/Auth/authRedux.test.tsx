import * as React from 'react';
import { createStore } from 'redux';
import { screen, act } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import PrivateRoute from 'route/auth/PrivateRoute';
import Library from 'route/library/Library';
import authReducer from 'store/auth.slice';
import { mockUser } from 'test/__mocks__/global_mocks';
import { renderWithRouter } from 'test/unit/unit.testUtil';
import { getValidationResults } from 'route/config/Verify'; // Globally mocked

jest.mock('util/auth/Authentication', () => ({
  useGetAndSetUsername: () => jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

jest.mock('page/Menu', () => ({
  __esModule: true,
  default: () => <div data-testid="menu" />,
}));

const store = createStore(authReducer);

type AuthState = {
  isAuthenticated: boolean;
};

const setupTest = async (authState: AuthState) => {
  (useAuth as jest.Mock).mockReturnValue({ ...authState, user: mockUser });
  (getValidationResults as jest.Mock).mockReturnValue(Promise.resolve({}));

  if (authState.isAuthenticated) {
    store.dispatch({
      type: 'auth/setUserName',
      payload: mockUser.profile.profile!.split('/')[1],
    });
  } else {
    store.dispatch({ type: 'auth/setUserName', payload: undefined });
  }

  await act(async () => {
    renderWithRouter(
      <PrivateRoute>
        <Library />
      </PrivateRoute>,
      { route: '/private', store },
    );
  });
};

describe('Redux and Authentication integration test', () => {
  let initialState: {
    auth: {
      userName: string | undefined;
    };
  };
  beforeEach(() => {
    jest.clearAllMocks();
    initialState = {
      auth: {
        userName: undefined,
      },
    };
  });

  it('renders undefined username when not authenticated', async () => {
    await setupTest({
      isAuthenticated: false,
    });

    expect(screen.getByText('Sign In with GitLab')).toBeInTheDocument();
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(
      initialState.auth,
    );
    expect(store.getState().userName).toBe(undefined);
  });

  it('renders the correct username when authenticated', async () => {
    await setupTest({
      isAuthenticated: true,
    });

    expect(screen.getByText('Functions')).toBeInTheDocument();
    expect(store.getState().userName).toBe('username');
  });

  it('renders undefined username after ending authentication', async () => {
    await setupTest({
      isAuthenticated: true,
    });
    expect(screen.getByText('Functions')).toBeInTheDocument();
    expect(store.getState().userName).toBe('username');

    await setupTest({
      isAuthenticated: false,
    });
    expect(screen.getByText('Sign In with GitLab')).toBeInTheDocument();
    expect(store.getState().userName).toBe(undefined);
  });
});
