import { runDigitalTwin } from 'model/backend/gitlab/measure/measurement.pipeline';
import { clearAccessToken, setAccessToken } from 'util/auth/accessToken';

// The default config is read from the redux store, which is out of scope here.
// Stub it so the test reaches the authentication guard in initializeBackend.
jest.mock('model/backend/gitlab/measure/measurement.settings', () => ({
  getDefaultConfig: () => ({}),
}));

// initializeBackend reads the token from the module variable, not from
// sessionStorage. These tests cover that read and the guard that rejects when
// either the token or the username is missing.
describe('runDigitalTwin authentication guard', () => {
  beforeEach(() => {
    clearAccessToken();
    sessionStorage.clear();
  });

  afterEach(() => {
    clearAccessToken();
    sessionStorage.clear();
  });

  it('rejects when no access token has been set', async () => {
    sessionStorage.setItem('username', 'user1');
    await expect(runDigitalTwin('dt-name')).rejects.toThrow(
      'Not authenticated. Missing access_token or username.',
    );
  });

  it('rejects when the username is missing even with a token', async () => {
    setAccessToken('a-token');
    await expect(runDigitalTwin('dt-name')).rejects.toThrow(
      'Not authenticated. Missing access_token or username.',
    );
  });
});
