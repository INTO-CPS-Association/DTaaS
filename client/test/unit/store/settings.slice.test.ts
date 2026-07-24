import settingsReducer, {
  setGroupName,
  setDTDirectory,
  setCommonLibraryProjectName,
  setRunnerTag,
  setLoggingEnabled,
  setRemoteLoggingEnabled,
  resetToDefaults,
  DEFAULT_SETTINGS,
  DEFAULT_MEASUREMENT,
  getDefaultLoggingEnabled,
  getDefaultRemoteLoggingEnabled,
  getEffectiveRemoteLoggingEnabled,
  getRemoteLoggerOrigin,
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

  it('does not clear remote logging when local logging is disabled', () => {
    const state = settingsReducer(
      {
        ...initialState,
        loggingEnabled: true,
        remoteLoggingEnabled: true,
      },
      setLoggingEnabled(false),
    );
    expect(state.loggingEnabled).toBe(false);
    expect(state.remoteLoggingEnabled).toBe(true);
  });

  it('should handle setRemoteLoggingEnabled when a logger is configured', () => {
    const originalEnv = globalThis.env;
    globalThis.env = {
      ...originalEnv,
      LOGGER_URL: 'https://example.com/logger',
    };

    try {
      const state = settingsReducer(
        { ...initialState, loggingEnabled: false },
        setRemoteLoggingEnabled(true),
      );
      expect(state.remoteLoggingEnabled).toBe(true);
      expect(state.remoteLoggerOriginAtSave).toBe('https://example.com');
    } finally {
      globalThis.env = originalEnv;
    }
  });

  it('normalizes the remote logger origin for consent', () => {
    const originalEnv = globalThis.env;
    globalThis.env = {
      ...originalEnv,
      LOGGER_URL: 'https://example.com:8443/logger/',
    };

    try {
      expect(getRemoteLoggerOrigin()).toBe('https://example.com:8443');
    } finally {
      globalThis.env = originalEnv;
    }
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

  it('defaults remote logging off', () => {
    expect(getDefaultRemoteLoggingEnabled()).toBe(false);
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

  it('keeps local logging but does not infer remote logging when a logger appears', () => {
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
      expect(result.loggingEnabled).toBe(true);
      expect(result.remoteLoggingEnabled).toBe(false);
      expect(result.remoteLoggerOriginAtSave).toBe('https://example.com');
    } finally {
      globalThis.env = originalEnv;
    }
  });

  it('keeps remote logging when the saved origin matches the current logger', () => {
    const originalEnv = globalThis.env;
    globalThis.env = {
      ...originalEnv,
      LOGGER_URL: 'https://example.com/logger',
    };
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({
        loggingEnabled: true,
        remoteLoggingEnabled: true,
        remoteLoggerOriginAtSave: 'https://example.com',
      }),
    );

    try {
      const result = loadInitialSettings();
      expect(result.loggingEnabled).toBe(true);
      expect(result.remoteLoggingEnabled).toBe(true);
    } finally {
      globalThis.env = originalEnv;
    }
  });

  it('clears remote logging when the configured logger origin changes', () => {
    const originalEnv = globalThis.env;
    globalThis.env = {
      ...originalEnv,
      LOGGER_URL: 'https://new.example.com/logger',
    };
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({
        loggingEnabled: true,
        remoteLoggingEnabled: true,
        remoteLoggerOriginAtSave: 'https://old.example.com',
      }),
    );

    try {
      const result = loadInitialSettings();
      expect(result.loggingEnabled).toBe(true);
      expect(result.remoteLoggingEnabled).toBe(false);
      expect(result.remoteLoggerOriginAtSave).toBe('https://new.example.com');
    } finally {
      globalThis.env = originalEnv;
    }
  });

  it('reports effective remote logging using persisted consent rules', () => {
    const originalEnv = globalThis.env;
    globalThis.env = {
      ...originalEnv,
      LOGGER_URL: 'https://example.com/logger',
    };
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({
        remoteLoggingEnabled: true,
      }),
    );

    try {
      expect(getEffectiveRemoteLoggingEnabled()).toBe(false);
    } finally {
      globalThis.env = originalEnv;
    }
  });

  it('clears persisted remote logging when no remote logger is configured', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({
        loggingEnabled: true,
        remoteLoggingEnabled: true,
      }),
    );

    const result = loadInitialSettings();
    expect(result.loggingEnabled).toBe(true);
    expect(result.remoteLoggingEnabled).toBe(false);
    expect(result.remoteLoggerOriginAtSave).toBe('');
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
