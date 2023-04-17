import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PrivateRoute from '../../../src/components/PrivateRoute';
import AuthContext from '../../../src/components/AuthContext';

test('renders children when user is authenticated', () => {
  const TestComponent = () => <div>Test component</div>;

  render(
    <AuthContext.Provider
      value={{ isLoggedIn: true, logIn: () => undefined, logOut: () => undefined }}
    >
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={
              <PrivateRoute>
                <TestComponent />
              </PrivateRoute>
            }
          />
          <Route path="/private/inner" element={<TestComponent />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

  expect(screen.getByText('Test component')).toBeInTheDocument();
});

test('redirects to / when user is not authenticated', () => {
  const TestComponent = () => <div>Test component</div>;

  render(
    <AuthContext.Provider
      value={{ isLoggedIn: false, logIn: () => undefined, logOut: () => undefined }}
    >
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <TestComponent />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

  expect(screen.getByText('Home')).toBeInTheDocument();
});
