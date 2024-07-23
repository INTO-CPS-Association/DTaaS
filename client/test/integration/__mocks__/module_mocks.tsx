jest.mock('util/auth/Authentication', () => ({
  getAndSetUsername: jest.fn(),
}));

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
}));
