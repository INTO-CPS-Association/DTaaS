import {
  clearAccessToken,
  clearUsername,
  getAccessToken,
  getUsername,
  setAccessToken,
  setUsername,
} from 'src/util/credentials';

describe('credentials', () => {
  afterEach(() => {
    clearAccessToken();
    clearUsername();
    sessionStorage.clear();
  });

  it('are empty before they are set', () => {
    expect(getAccessToken()).toBe('');
    expect(getUsername()).toBe('');
  });

  it('return what was set, without writing it to sessionStorage', () => {
    setAccessToken('a-token');
    setUsername('a-user');
    expect(getAccessToken()).toBe('a-token');
    expect(getUsername()).toBe('a-user');
    expect(sessionStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('username')).toBeNull();
  });

  it('are cleared independently', () => {
    setAccessToken('a-token');
    setUsername('a-user');
    clearAccessToken();
    expect(getAccessToken()).toBe('');
    expect(getUsername()).toBe('a-user');
    clearUsername();
    expect(getUsername()).toBe('');
  });
});
