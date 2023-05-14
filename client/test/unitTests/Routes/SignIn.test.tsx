import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import SignIn from 'route/auth/Signin';
import AuthContext from 'components/AuthContext';
import { Provider } from 'react-redux';
import store from 'store/store';

jest.unmock('react-redux'); // unmock to use the actual implementation of react-redux useSelector

describe('SignIn', () => {
  it('renders the SignIn form', () => {
    render(
      <Provider store={store}>
        <AuthContext.Provider
          value={{
            isLoggedIn: false,
            logIn: () => undefined,
            logOut: () => undefined,
          }}
        >
          <Router>
            <SignIn />
          </Router>
        </AuthContext.Provider>
      </Provider>
    );
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sign In/i })
    ).toBeInTheDocument();
  });

  // Add more tests for form submission and redirection as needed
});
