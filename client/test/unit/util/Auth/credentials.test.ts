import * as automation from '@into-cps-association/dt-automation';
import {
  clearAccessToken,
  clearUsername,
  getAccessToken,
  getUsername,
  setAccessToken,
  setUsername,
} from 'util/auth/credentials';

describe('the core credential store', () => {
  afterEach(() => {
    clearAccessToken();
    clearUsername();
  });

  it('is empty before sign-in', () => {
    expect(getAccessToken()).toBe('');
    expect(getUsername()).toBe('');
  });

  it('holds the token and username it is given', () => {
    setAccessToken('core-token');
    setUsername('user1');

    expect(getAccessToken()).toBe('core-token');
    expect(getUsername()).toBe('user1');
  });

  it('pushes both into the automation package', () => {
    setAccessToken('core-token');
    setUsername('user1');

    expect(automation.getAccessToken()).toBe('core-token');
    expect(automation.getUsername()).toBe('user1');
  });

  it('clears both in the core and in the automation package', () => {
    setAccessToken('core-token');
    setUsername('user1');
    clearAccessToken();
    clearUsername();

    expect(getAccessToken()).toBe('');
    expect(getUsername()).toBe('');
    expect(automation.getAccessToken()).toBe('');
    expect(automation.getUsername()).toBe('');
  });

  it('does not keep the token in sessionStorage', () => {
    setAccessToken('core-token');

    const stored = Object.keys(sessionStorage).map((key) =>
      sessionStorage.getItem(key),
    );
    expect(stored).not.toContain('core-token');
  });
});
