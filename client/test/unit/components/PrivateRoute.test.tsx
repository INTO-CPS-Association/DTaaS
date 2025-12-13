import { screen, waitFor } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import PrivateRoute from 'route/auth/PrivateRoute';
import { renderWithRouter } from 'test/unit/unit.testUtil';

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

    await waitFor(
      () => {
        expect(screen.getByText('Signin')).toBeInTheDocument();
      },
      {
        timeout: 60000,
      },
    );

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
    expect(screen.getByText(/CustomSnackbar/i)).toBeInTheDocument();
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
});
