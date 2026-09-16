import '@testing-library/jest-dom';
import * as React from 'react';
import { render } from '@testing-library/react';
import AuthProvider, { onSigninCallback } from 'route/auth/AuthProvider';
import { useOidcConfig } from 'util/auth/useOidcConfig';

jest.mock('react-oidc-context', () => {
  const actualModule = jest.requireActual('react-oidc-context');
  return {
    ...actualModule,
    AuthProvider: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

jest.mock('util/auth/useOidcConfig', () => ({
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

  it('renders OIDCAuthProvider when OIDC config is available', () => {
    const { getByText } = renderAuthProvider(<DummyComponent />);

    expect(getByText('Dummy Component')).toBeInTheDocument();
  });

  it('renders fallback when OIDC config is not available', () => {
    (useOidcConfig as jest.Mock).mockReturnValue(null);
    const { getByText } = renderAuthProvider(<DummyComponent />);

    expect(
      getByText('Authentication service unavailable...try again later'),
    ).toBeInTheDocument();
  });

  it('renders the children passed to AuthProvider', () => {
    const { getByText } = renderAuthProvider(<DummyComponent />);

    expect(getByText('Dummy Component')).toBeInTheDocument();
  });
});

describe('onSigninCallback', () => {
  it('strips the authorization code and state from the address bar', () => {
    const replaceState = jest
      .spyOn(globalThis.history, 'replaceState')
      .mockImplementation(() => {});
    globalThis.history.pushState({}, '', '/Library?code=abc&state=xyz');

    onSigninCallback();

    // Called with the bare path, so the spent code and state leave the URL
    // while the page a deep link points at survives.
    expect(replaceState).toHaveBeenCalledWith({}, document.title, '/Library');

    replaceState.mockRestore();
  });
});
