import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import SignIn from 'route/auth/Signin';
import { useAuth } from 'react-oidc-context';

jest.mock('react-oidc-context');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.unmock('react-redux'); // unmock to use the actual implementation of react-redux useSelector

describe('SignIn', () => {
  const signinRedirect = jest.fn();

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      signinRedirect,
    });

    (useNavigate as jest.Mock).mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the SignIn form', () => {
    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sign In/i })
    ).toBeInTheDocument();
  });

  it('handles form submission', () => {
    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>
    );

    const signInButton = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.submit(signInButton);

    expect(signinRedirect).toHaveBeenCalled();
  });
});


