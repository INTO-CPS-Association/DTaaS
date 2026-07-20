import settingsReducer, {
  setGroupName,
  setDTDirectory,
  setCommonLibraryProjectName,
  setRunnerTag,
  setLoggingEnabled,
  resetToDefaults,
  DEFAULT_SETTINGS,
  DEFAULT_MEASUREMENT,
  getDefaultLoggingEnabled,
  loadInitialSettings,
} from 'store/settings.slice';

describe('settingsSlice', () => {
  const initialState = { ...DEFAULT_SETTINGS, ...DEFAULT_MEASUREMENT };

  beforeEach(() => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  });

  it('should handle setGroupName', () => {
    const state = settingsReducer(initialState, setGroupName('testGroup'));
    expect(state.GROUP_NAME).toBe('testGroup');
  });

  it('should handle setDTDirectory', () => {
    const state = settingsReducer(
      initialState,
      setDTDirectory('testDTDirectory'),
    );
    expect(state.DT_DIRECTORY).toBe('testDTDirectory');
  });

  it('should handle setCommonLibraryProjectName', () => {
    const state = settingsReducer(
      initialState,
      setCommonLibraryProjectName('testCommonLibraryProjectName'),
    );
    expect(state.COMMON_LIBRARY_PROJECT_NAME).toBe(
      'testCommonLibraryProjectName',
    );
  });

  it('should handle setRunnerTag', () => {
    const state = settingsReducer(initialState, setRunnerTag('testRunnerTag'));
    expect(state.RUNNER_TAG).toBe('testRunnerTag');
  });

  it('should handle setLoggingEnabled', () => {
    const state = settingsReducer(initialState, setLoggingEnabled(true));
    expect(state.loggingEnabled).toBe(true);
  });

  it('defaults logging off when no remote logger is configured', () => {
    const originalEnv = globalThis.env;
    globalThis.env = { ...originalEnv };
    delete globalThis.env.LOGGER_URL;

    try {
      expect(getDefaultLoggingEnabled()).toBe(false);
    } finally {
      globalThis.env = originalEnv;
    }
  });

  it('defaults logging off when a remote logger is configured', () => {
    const originalEnv = globalThis.env;
    globalThis.env = {
      ...originalEnv,
      LOGGER_URL: 'https://example.com/logger',
    };

    try {
      expect(getDefaultLoggingEnabled()).toBe(false);
    } finally {
      globalThis.env = originalEnv;
    }
  });

  it('does not carry a pre-remote loggingEnabled choice over as remote consent', () => {
    const originalEnv = globalThis.env;
    globalThis.env = {
      ...originalEnv,
      LOGGER_URL: 'https://example.com/logger',
    };
    jest
      .spyOn(Storage.prototype, 'getItem')
      .mockReturnValue(JSON.stringify({ loggingEnabled: true }));

    try {
      const result = loadInitialSettings();
      expect(result.loggingEnabled).toBe(false);
      expect(result.remoteLoggerConfiguredAtSave).toBe(true);
    } finally {
      globalThis.env = originalEnv;
    }
  });

  it('keeps a loggingEnabled choice made while the remote logger was configured', () => {
    const originalEnv = globalThis.env;
    globalThis.env = {
      ...originalEnv,
      LOGGER_URL: 'https://example.com/logger',
    };
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({
        loggingEnabled: true,
        remoteLoggerConfiguredAtSave: true,
      }),
    );

    try {
      expect(loadInitialSettings().loggingEnabled).toBe(true);
    } finally {
      globalThis.env = originalEnv;
    }
  });

  it('should handle resetToDefaults', () => {
    const modified = {
      ...initialState,
      GROUP_NAME: 'testGroup',
      DT_DIRECTORY: 'testDTDirectory',
      trials: 99,
    };

    const state = settingsReducer(modified, resetToDefaults());
    expect(state).toEqual(initialState);
  });

  it('loads and merges settings from localStorage', () => {
    const parsedSettings = { GROUP_NAME: 'custom', DT_DIRECTORY: 'custom_dt' };
    const savedJson = JSON.stringify(parsedSettings);

    const getItemSpy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockReturnValue(savedJson);
    const parseSpy = jest.spyOn(JSON, 'parse');

    const result = loadInitialSettings();

    expect(getItemSpy).toHaveBeenCalledWith('settings');
    expect(parseSpy).toHaveBeenCalledWith(savedJson);
    expect(result).toEqual({
      ...DEFAULT_SETTINGS,
      ...DEFAULT_MEASUREMENT,
      ...parsedSettings,
    });
  });

  it('returns defaults when localStorage is empty', () => {
    expect(loadInitialSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      ...DEFAULT_MEASUREMENT,
    });
  });

  it('falls back to defaults when a persisted field has the wrong type', () => {
    const tampered = { GROUP_NAME: 123, trials: 'not-a-number' };
    jest
      .spyOn(Storage.prototype, 'getItem')
      .mockReturnValue(JSON.stringify(tampered));

    expect(loadInitialSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      ...DEFAULT_MEASUREMENT,
    });
  });

  it('falls back to defaults when persisted settings is not an object', () => {
    jest
      .spyOn(Storage.prototype, 'getItem')
      .mockReturnValue(JSON.stringify(['tampered', 'array']));

    expect(loadInitialSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      ...DEFAULT_MEASUREMENT,
    });
  });

  it('falls back to defaults when persisted settings is not valid JSON', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('{not-json');

    expect(loadInitialSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      ...DEFAULT_MEASUREMENT,
    });
  });
});
