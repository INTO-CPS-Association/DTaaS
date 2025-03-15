import {
  retryFetch,
  getValidationResults,
  urlIsReachable,
  ValidationType,
} from 'util/configUtil';

jest.deepUnmock('util/configUtil');

Object.defineProperty(AbortSignal, 'timeout', {
  value: jest.fn(),
  writable: false,
});

describe('configUtil', () => {
  let networkError: Error;
  const initialEnv = { ...window.env };
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
    networkError = new Error('Network error');
  });

  afterEach(() => {
    window.env = { ...initialEnv };
    jest.resetAllMocks();
  });

  const mockResponse = {
    ok: true,
    status: 200,
    json: (): Promise<{ data: string }> => Promise.resolve({ data: 'success' }),
  } as Response;

  describe('retryFetch', () => {
    test('retryFetch returns a valid response', async () => {
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      const response: Response = await retryFetch('https://foo.bar', {
        method: 'HEAD',
        signal: AbortSignal.timeout(1000),
      });
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const jsonResult = (await response.json()) as { data: string };
      expect(jsonResult).toEqual({ data: 'success' });
    });

    test('retryFetch retries conditionally until getting a valid response', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockResponse);

      const response: Response = await retryFetch(
        'http://foo.foo',
        {
          method: 'HEAD',
          mode: 'no-cors',
          signal: AbortSignal.timeout(1500),
        },
        3,
      );
      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    test('retryFetch retries until failing', async () => {
      global.fetch = jest.fn().mockRejectedValue(networkError);

      const fetchPromise: Promise<Response> = retryFetch('https://bar.com');
      await expect(fetchPromise).rejects.toThrow(networkError);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('getValidationResults', () => {
    test('getValidationResults object includes all keys of window.env', async () => {
      const results: ValidationType = await getValidationResults();
      const resultKeys: string[] = Object.keys(results);
      const envKeys: string[] = Object.keys(window.env);

      const missingKeys: string[] = envKeys.filter(
        (key) => !resultKeys.includes(key),
      );
      const unexpectedKeys: string[] = resultKeys.filter(
        (key) => !envKeys.includes(key),
      );

      expect(missingKeys).toEqual([]);
      expect(unexpectedKeys).toEqual([]);
    });
    test('getValidationResult AUTH_AUTHORITY has error if it fails reachability', async () => {
      window.env.REACT_APP_AUTH_AUTHORITY = 'https://foo.bar';
      global.fetch = jest.fn().mockRejectedValue(networkError);
      const results: Record<string, ValidationType> =
        await getValidationResults();
      expect(results.REACT_APP_AUTH_AUTHORITY.error).toBeDefined();
      expect(results.REACT_APP_AUTH_AUTHORITY.status).toBeUndefined();
      expect(results.REACT_APP_AUTH_AUTHORITY.value).toBeUndefined();
    });

    test('getValidationResult ENVIRONMENT has error if it fails parse', async () => {
      window.env.REACT_APP_ENVIRONMENT = 'foo';
      const results: Record<string, ValidationType> =
        await getValidationResults();
      expect(results.REACT_APP_ENVIRONMENT.error).toBeDefined();
      expect(results.REACT_APP_ENVIRONMENT.status).toBeUndefined();
      expect(results.REACT_APP_ENVIRONMENT.value).toBeUndefined();
    });

    test('getValidationResult CLIENT_ID has value if it succeeds parse', async () => {
      const results = await getValidationResults();
      expect(results.REACT_APP_CLIENT_ID.error).toBeUndefined();
      expect(results.REACT_APP_CLIENT_ID.status).toBeUndefined();
      expect(results.REACT_APP_CLIENT_ID.value).toEqual('abc123');
    });
  });

  describe('urlIsReachable', () => {
    test('urlIsReachable object has value if it succeeds', async () => {
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      const result: ValidationType = await urlIsReachable('https://foo.bar');
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(200);
      expect(result.value).toEqual('https://foo.bar');
    });

    test('urlIsReachable object has error if it fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(networkError);
      const result: ValidationType = await urlIsReachable('https://foo.bar');
      expect(result.error).toBeDefined();
      expect(result.status).toBeUndefined();
      expect(result.value).toBeUndefined();
    });
  });
});
