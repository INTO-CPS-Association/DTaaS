import reducer, {
  loadInitialEnvironment,
  updateAuthority,
} from 'src/store/environment.slice';

describe('environment slice', () => {
  it('starts without an application-specific authority', () => {
    expect(loadInitialEnvironment()).toEqual({ AUTH_AUTHORITY: '' });
  });

  it('accepts the authority supplied by the consuming application', () => {
    const state = reducer(undefined, updateAuthority('https://gitlab.com'));

    expect(state.AUTH_AUTHORITY).toBe('https://gitlab.com');
  });
});
