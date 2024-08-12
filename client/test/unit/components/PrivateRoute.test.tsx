import * as React from 'react';
import { screen } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import PrivateRoute from 'route/auth/PrivateRoute';
import { renderWithRouter } from 'test/unit/unit.testUtil';

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

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

test('renders loading and redirects correctly when authenticated/not authentic', () => {
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
});

test('renders error', () => {
  setupTest({
    isLoading: false,
    error: new Error('Test error'),
    isAuthenticated: false,
  });

  expect(screen.getByText('Oops... Test error')).toBeInTheDocument();
});
