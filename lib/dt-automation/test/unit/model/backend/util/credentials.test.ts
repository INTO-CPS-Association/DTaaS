import {
  clearAccessToken,
  clearUsername,
  getAccessToken,
  getUsername,
  setAccessToken,
  setUsername,
} from 'src/util/credentials';

const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(globalThis, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

describe('credentials', () => {
  afterEach(() => {
    clearAccessToken();
    clearUsername();
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
    expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
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
