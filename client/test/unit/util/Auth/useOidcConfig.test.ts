import { renderHook } from '@testing-library/react';
import { useOidcConfig } from 'util/auth/useOidcConfig';

jest.unmock('util/auth/useOidcConfig');

describe('the OIDC configuration', () => {
  beforeEach(() => {
    globalThis.env.REACT_APP_CLIENT_ID = 'client';
    sessionStorage.clear();
    localStorage.clear();
  });

  it('keeps the signed-in user in memory and out of web storage', async () => {
    const { result } = renderHook(() => useOidcConfig());
    const store = result.current?.userStore;

    await store?.set('user:https://gitlab.example.com/:client', 'tokens');

    await expect(store?.getAllKeys()).resolves.toHaveLength(1);
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it('leaves silent renewal off, since GitLab cannot be framed', () => {
    const { result } = renderHook(() => useOidcConfig());

    expect(result.current?.automaticSilentRenew).toBe(false);
  });
});
