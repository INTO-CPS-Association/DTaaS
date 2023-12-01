import * as React from 'react';
import { createStore } from 'redux';
import { screen } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import PrivateRoute from '../../src/route/auth/PrivateRoute';
import Library from '../../src/route/library/Library';
import authReducer from '../../src/store/auth.slice';
import { renderWithRouter } from '../unitTests/testUtils';

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

jest.mock('../../src/util/auth/Authentication', () => ({
  getAndSetUsername: jest.fn(),
}));

const store = createStore(authReducer);

type AuthState = {
  isAuthenticated: boolean;
};

const setupTest = (authState: AuthState) => {
  const userMock = {
    profile: {
      profile: 'example/username',
    },
    access_token: 'example_token',
  };

  (useAuth as jest.Mock).mockReturnValue({ ...authState, user: userMock });

  if (authState.isAuthenticated) {
    store.dispatch({
      type: 'auth/setUserName',
      payload: userMock.profile.profile.split('/')[1],
    });
  } else {
    store.dispatch({ type: 'auth/setUserName', payload: undefined });
  }

  renderWithRouter(
    <PrivateRoute>
      <Library />
    </PrivateRoute>,
    { route: '/private', store },
  );
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

  it('renders undefined username when not authenticated', () => {
    setupTest({
      isAuthenticated: false,
    });

    expect(screen.getByText('Signin')).toBeInTheDocument();
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(
      initialState.auth,
    );
    expect(store.getState().userName).toBe(undefined);
  });

  it('renders the correct username when authenticated', () => {
    setupTest({
      isAuthenticated: true,
    });

    expect(screen.getByText('Functions')).toBeInTheDocument();
    expect(store.getState().userName).toBe('username');
  });

  it('renders undefined username after ending authentication', () => {
    setupTest({
      isAuthenticated: true,
    });
    expect(screen.getByText('Functions')).toBeInTheDocument();
    expect(store.getState().userName).toBe('username');

    setupTest({
      isAuthenticated: false,
    });
    expect(screen.getByText('Signin')).toBeInTheDocument();
    expect(store.getState().userName).toBe(undefined);
  });
});
