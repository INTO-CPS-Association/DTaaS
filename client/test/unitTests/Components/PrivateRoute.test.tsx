import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PrivateRoute from 'components/PrivateRoute';
import { useSelector } from 'react-redux';

test('renders children when user is authenticated', () => {
  (useSelector as jest.Mock).mockReturnValue({ isLoggedIn: true });
  const TestComponent = () => <div>Test component</div>;

  render(
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
  );

  expect(screen.getByText('Test component')).toBeInTheDocument();
});

test('redirects to / when user is not authenticated', () => {
  (useSelector as jest.Mock).mockReturnValue({ isLoggedIn: false });

  const TestComponent = () => <div>Test component</div>;

  render(
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
  );

  expect(screen.getByText('Home')).toBeInTheDocument();
});
