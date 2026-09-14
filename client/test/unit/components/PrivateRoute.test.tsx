import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import PrivateRoute from 'route/auth/PrivateRoute';
import { renderWithRouter } from 'test/unit/unit.testUtil';
import { getAccessToken } from 'util/auth/accessToken';

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
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('renders loading and redirects correctly when authenticated/not authentic', async () => {
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

  test('renders error', () => {
    setupTest({
      isLoading: false,
      error: new Error('Test error'),
      isAuthenticated: false,
    });

    expect(screen.getByText('Oops... Test error')).toBeInTheDocument();
    expect(screen.getByText('Mock WaitNavigateAndReload')).toBeInTheDocument();
  });

  test('holds the access token in memory when authenticated', () => {
    setupTest({ isLoading: false, error: null, isAuthenticated: true });

    expect(getAccessToken()).toBe('example_token');
  });

  test('keeps the access token out of sessionStorage', () => {
    // It used to be written there, where script on this origin can read it,
    // including script inside the same-origin iframes the library and digital
    // twin pages embed without a sandbox attribute.
    setupTest({ isLoading: false, error: null, isAuthenticated: true });

    const stored = Object.keys(sessionStorage).map((k) =>
      sessionStorage.getItem(k),
    );
    expect(stored).not.toContain('example_token');
  });

  test('throws when authenticated but user is null', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      isAuthenticated: true,
      user: null,
    });

    expect(() =>
      renderWithRouter(
        <PrivateRoute>
          <TestComponent />
        </PrivateRoute>,
        { route: '/private' },
      ),
    ).toThrow('Access token was not available...');
  });
});
