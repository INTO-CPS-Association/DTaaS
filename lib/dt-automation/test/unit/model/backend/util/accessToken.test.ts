import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from 'src/util/accessToken';

describe('accessToken', () => {
  afterEach(() => {
    clearAccessToken();
    sessionStorage.clear();
  });

  it('is empty before a token is set', () => {
    expect(getAccessToken()).toBe('');
  });

  it('returns the token that was set, without writing it to sessionStorage', () => {
    setAccessToken('a-token');
    expect(getAccessToken()).toBe('a-token');
    expect(sessionStorage.getItem('access_token')).toBeNull();
  });

  it('is empty again after it is cleared', () => {
    setAccessToken('a-token');
    clearAccessToken();
    expect(getAccessToken()).toBe('');
  });
});
