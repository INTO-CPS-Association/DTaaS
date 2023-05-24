import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import PrivateRoute from '../../../src/route/auth/PrivateRoute';

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

const TestComponent = () => <div>Test Component</div>;

const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);

  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/private" element={ui} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );
};

type AuthState = {
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
};

const setupTest = (authState: AuthState) => {
  (useAuth as jest.Mock).mockReturnValue(authState);

  renderWithRouter(
    <PrivateRoute>
      <TestComponent />
    </PrivateRoute>,
    { route: '/private' }
  );
};

test('renders loading and redirects correctly when authenticated/not authentic', () => {
  setupTest({
    isLoading: false,
    error: null,
    isAuthenticated: false,
  });

  expect(screen.getByText('Home')).toBeInTheDocument();

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
