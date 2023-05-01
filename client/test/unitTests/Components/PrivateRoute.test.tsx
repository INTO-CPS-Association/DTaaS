import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import PrivateRoute from '../../../src/components/PrivateRoute';

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

test('renders loading', () => {
  (useAuth as jest.Mock).mockReturnValue({
    isLoading: true,
    error: null,
    isAuthenticated: false,
  });

  renderWithRouter(<PrivateRoute><TestComponent /></PrivateRoute>, { route: '/private' });

  expect(screen.getByText('Loading...')).toBeInTheDocument();
});


test('renders error', () => {
  (useAuth as jest.Mock).mockReturnValue({
    isLoading: false,
    error: new Error('Test error'),
    isAuthenticated: false,
  });

  renderWithRouter(<PrivateRoute><TestComponent /></PrivateRoute>, { route: '/private' });

  expect(screen.getByText('Oops... Test error')).toBeInTheDocument();
});

test('redirects to root when not authenticated', () => {
  (useAuth as jest.Mock).mockReturnValue({
    isLoading: false,
    error: null,
    isAuthenticated: false,
  });

  renderWithRouter(<PrivateRoute><TestComponent /></PrivateRoute>, { route: '/private' });

  expect(screen.getByText('Home')).toBeInTheDocument();
});

test('renders children when authenticated', () => {
  (useAuth as jest.Mock).mockReturnValue({
    isLoading: false,
    error: null,
    isAuthenticated: true,
  });

  renderWithRouter(<PrivateRoute><TestComponent /></PrivateRoute>, { route: '/private' });

  expect(screen.getByText('Test Component')).toBeInTheDocument();
});