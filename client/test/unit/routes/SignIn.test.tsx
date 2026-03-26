import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SignIn from 'route/auth/Signin';
import { useAuth } from 'react-oidc-context';

jest.unmock('route/auth/Signin');
jest.mock('react-oidc-context');

describe('SignIn', () => {
  const signinRedirect = jest.fn();

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      signinRedirect,
    });
  });

  it('renders the SignIn button', () => {
    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /SignIn/i })).toBeInTheDocument();
  });

  it('handles button click', () => {
    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    );

    const signInButton = screen.getByRole('button', {
      name: /SignIn/i,
    });
    fireEvent.click(signInButton);

    expect(signinRedirect).toHaveBeenCalled();
  });
});
