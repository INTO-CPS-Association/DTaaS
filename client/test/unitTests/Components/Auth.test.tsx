import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import useFakeAuth from 'components/Auth';

function TestComponent() {
  const { isLoggedIn, logIn, logOut } = useFakeAuth();
  const [state, setState] = useState(isLoggedIn);

  return (
    <>
      <div>Is logged in: {state.toString()}</div>
      <button
        onClick={() => {
          logIn();
          setState(true);
        }}
      >
        Log In
      </button>
      <button
        onClick={() => {
          logOut();
          setState(false);
        }}
      >
        Log Out
      </button>
    </>
  );
}

describe('useFakeAuth', () => {
  it('should update isLoggedIn state when logIn and logOut are called', async () => {
    render(<TestComponent />);
    expect(screen.getByText(/Is logged in: false/i)).toBeInTheDocument();

    const loginButton = screen.getByText(/Log In/i);
    const logoutButton = screen.getByText(/Log Out/i);

    loginButton.click();
    await waitFor(() =>
      expect(screen.getByText(/Is logged in: true/i)).toBeInTheDocument()
    );

    logoutButton.click();
    await waitFor(() =>
      expect(screen.getByText(/Is logged in: false/i)).toBeInTheDocument()
    );
  });
});
