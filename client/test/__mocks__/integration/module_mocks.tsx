jest.mock('react-oidc-context', () => ({
    ...jest.requireActual('react-oidc-context'),
    useAuth: jest.fn(),
}));