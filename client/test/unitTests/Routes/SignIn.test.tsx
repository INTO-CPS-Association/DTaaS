import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import SignIn from 'route/auth/Signin';
import { useSelector } from 'react-redux';

jest.unmock('react-redux'); // unmock to use the actual implementation of react-redux useSelector

describe('SignIn', () => {
  const authenticated = false;

  beforeEach(() => {
    (useSelector as jest.Mock).mockReturnValue({ isLoggedIn: authenticated });
  });

  it('renders the SignIn form', () => {
    render(<SignIn />, { wrapper: Router });
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sign In/i })
    ).toBeInTheDocument();
  });

  // Add more tests for form submission and redirection as needed
});
