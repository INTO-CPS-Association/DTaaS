import * as React from 'react';
import { render, screen } from '@testing-library/react';
import SignIn from 'route/auth/Signin';

jest.mock('page/Footer', () => ({
  default: () => <div data-testid="footer-mock">footer-mock</div>,
}));
jest.mock('@mui/icons-material/LockOutlined', () => ({
  default: () => <div>lock-outlined-mock</div>,
}));

describe('SignIn', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders SignIn', () => {
    render(<SignIn />);
    expect(true);
  });

  it('renders AppBar, Avatar, and Typography components', () => {
    render(<SignIn />);
    expect(
      screen.queryByText('The Digital Twin as a Service')
    ).toBeInTheDocument();
    expect(screen.queryByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByText('lock-outlined-mock')).toBeInTheDocument();
  });

  it('renders Footer component', () => {
    render(<SignIn />);
    expect(screen.queryByTestId('footer-mock')).toBeInTheDocument();
  });

  it('renders GitLab sign in button', () => {
    render(<SignIn />);
    const gitlabButton = screen.getByText('Sign in with GitLab');
    expect(gitlabButton).toBeInTheDocument();
  });
});