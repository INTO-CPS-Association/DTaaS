import * as React from 'react';
import { render } from '@testing-library/react';
import AuthProvider from '../../../src/route/auth/AuthProvider';
import { useOidcConfig } from '../../../src/util/auth/useOidcConfig';

jest.mock('react-oidc-context', () => {
  const actualModule = jest.requireActual('react-oidc-context');
  return {
    ...actualModule,
    AuthProvider: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

jest.mock('../../../src/util/auth/useOidcConfig', () => ({
  useOidcConfig: jest.fn(),
}));

const renderAuthProvider = (children: React.ReactNode) =>
  render(<AuthProvider>{children}</AuthProvider>);

describe('AuthProvider', () => {
  const DummyComponent: React.FC = () => <div>Dummy Component</div>;
  const oidcConfig = { someConfig: 'value' };

  beforeEach(() => {
    (useOidcConfig as jest.Mock).mockReturnValue(oidcConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a loading message while waiting for OIDC config', () => {
    (useOidcConfig as jest.Mock).mockReturnValue(undefined);

    const { getByText } = renderAuthProvider(<DummyComponent />);

    expect(
      getByText('Authentication service unavailable...try again later'),
    ).toBeInTheDocument();
  });

  it('renders OIDCAuthProvider when OIDC config is available', () => {
    const { getByText } = renderAuthProvider(<DummyComponent />);

    expect(getByText('Dummy Component')).toBeInTheDocument();
  });

  it('renders the children passed to AuthProvider', () => {
    const { getByText } = renderAuthProvider(<DummyComponent />);

    expect(getByText('Dummy Component')).toBeInTheDocument();
  });
});
