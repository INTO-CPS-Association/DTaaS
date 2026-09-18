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
  // These let the real replaceState run and then read the address bar, because
  // the claim being made is that the parameters leave the URL, and a stubbed
  // call can only show which arguments it was given.
  it('strips what the provider added from the address bar', () => {
    globalThis.history.pushState(
      {},
      '',
      '/Library?code=abc&state=xyz&session_state=s&iss=https%3A%2F%2Fidp',
    );

    onSigninCallback();

    expect(globalThis.location.pathname).toBe('/Library');
    expect(globalThis.location.search).toBe('');
  });

  it('keeps a query and a hash the redirect URI carried itself', () => {
    // A redirect URI is free to carry its own parameters. Replacing the entry
    // with the bare path used to drop them along with the spent code.
    globalThis.history.pushState({}, '', '/Library?code=abc&tab=models#top');

    onSigninCallback();

    expect(globalThis.location.pathname).toBe('/Library');
    expect(globalThis.location.search).toBe('?tab=models');
    expect(globalThis.location.hash).toBe('#top');
  });

  it('keeps the history state the router put there', () => {
    // React Router keeps its entry index in history.state. Replacing it with an
    // empty object costs scroll restoration and back-button handling until the
    // next push repairs it.
    globalThis.history.pushState({ idx: 4 }, '', '/Library?code=abc');

    onSigninCallback();

    expect(globalThis.history.state).toEqual({ idx: 4 });
  });
});
