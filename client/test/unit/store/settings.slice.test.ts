import settingsReducer, {
  setGroupName,
  setDTDirectory,
  setCommonLibraryProjectName,
  setRunnerTag,
  resetToDefaults,
  DEFAULT_SETTINGS,
  DEFAULT_MEASUREMENT,
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
});
