import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import PrivateRoute from 'route/auth/PrivateRoute';
import { renderWithRouter } from 'test/unit/unit.testUtil';
import { getAccessToken } from 'util/auth/accessToken';
import { useDispatch } from 'react-redux';
import { setUserName } from 'store/auth.slice';

jest.mock('routes', () => {
  const MockSignin = () => <div>Signin</div>;
  return {
    __esModule: true,
    default: [{ path: '/', element: <MockSignin /> }],
  };
});

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('components/execution/ExecutionHistoryLoader', () => {
  const MockExecutionHistoryLoader = () => (
    <div>Mock ExecutionHistoryLoader</div>
  );
  return { __esModule: true, default: MockExecutionHistoryLoader };
});

jest.mock('components/route/Snackbar', () => {
  const MockCustomSnackbar = () => <div>Mock CustomSnackbar</div>;
  return { __esModule: true, default: MockCustomSnackbar };
});

jest.mock('route/auth/WaitAndNavigate', () => {
  const MockWaitNavigateAndReload = () => <div>Mock WaitNavigateAndReload</div>;
  return { __esModule: true, default: MockWaitNavigateAndReload };
});

const TestComponent = () => <div>Test Component</div>;

type AuthState = {
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
};

const setupTest = (authState: AuthState) => {
  const userMock = {
    profile: {
      profile: '/example/username',
    },
    access_token: 'example_token',
  };

  (useAuth as jest.Mock).mockReturnValue({ ...authState, user: userMock });

  renderWithRouter(
    <PrivateRoute>
      <TestComponent />
    </PrivateRoute>,
    { route: '/private' },
  );
};

describe('PrivateRoute', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    sessionStorage.clear();
    dispatch.mockClear();
    (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
  });

  test('Renders loading and redirects correctly when authenticated/not authentic', async () => {
    setupTest({
      isLoading: false,
      error: null,
      isAuthenticated: false,
    });

    expect(screen.getByText('Signin')).toBeInTheDocument();

    setupTest({
      isLoading: true,
      error: null,
      isAuthenticated: false,
    });

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    setupTest({
      isLoading: false,
      error: null,
      isAuthenticated: true,
    });

    expect(screen.getByText('Test Component')).toBeInTheDocument();
    expect(screen.getByText(/ExecutionHistoryLoader/i)).toBeInTheDocument();
  });

  test('Renders error', () => {
    setupTest({
      isLoading: false,
      error: new Error('Test error'),
      isAuthenticated: false,
    });

    expect(screen.getByText('Oops... Test error')).toBeInTheDocument();
    expect(screen.getByText('Mock WaitNavigateAndReload')).toBeInTheDocument();
  });

  test('Holds the access token in memory when authenticated', () => {
    setupTest({ isLoading: false, error: null, isAuthenticated: true });

    expect(getAccessToken()).toBe('example_token');
  });

  test('Does not write the access token to sessionStorage', () => {
    // This client used to write a second copy there, where script on this
    // origin can read it, including script inside the same-origin iframes the
    // library and digital twin pages embed without a sandbox attribute. The
    // OIDC user store keeps its own copy, which this change does not touch.
    setupTest({ isLoading: false, error: null, isAuthenticated: true });

    const stored = Object.keys(sessionStorage).map((k) =>
      sessionStorage.getItem(k),
    );
    expect(stored).not.toContain('example_token');
  });

  test('Sends the person to sign in when a session has no user', () => {
    // react-oidc-context should not report this state. If it ever does, the
    // route has no token for its children, so it redirects instead of throwing
    // during render and taking the page down with it.
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      isAuthenticated: true,
      user: null,
    });

    renderWithRouter(
      <PrivateRoute>
        <TestComponent />
      </PrivateRoute>,
      { route: '/private' },
    );

    expect(screen.queryByText('Test Component')).not.toBeInTheDocument();
    expect(getAccessToken()).toBe('');
  });

  test('Records the user name for whichever private page opens first', () => {
    // Every workspace address carries the name. A page opened directly, and
    // not after Library, used to find it empty and ask for //lab.
    setupTest({ isLoading: false, error: null, isAuthenticated: true });

    expect(dispatch).toHaveBeenCalledWith(setUserName('username'));
  });

  test('Records no user name before the session is established', () => {
    setupTest({ isLoading: true, error: null, isAuthenticated: false });

    expect(dispatch).not.toHaveBeenCalled();
  });
});
