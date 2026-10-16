import {
  FEATURES,
  getProfile,
  isFeatureEnabled,
  resetProfileWarning,
  usesDtAutomation,
} from 'util/profile';

describe('profile', () => {
  const original = globalThis.env.REACT_APP_PROFILE;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    resetProfileWarning();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.env.REACT_APP_PROFILE = original;
    warn.mockRestore();
  });

  it('is full when the key is missing', () => {
    delete globalThis.env.REACT_APP_PROFILE;
    expect(getProfile()).toBe('full');
    expect(warn).not.toHaveBeenCalled();
  });

  it('is full, without a warning, when the key is empty', () => {
    globalThis.env.REACT_APP_PROFILE = '';
    expect(getProfile()).toBe('full');
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(['full', 'workbench'])('reads %s', (value) => {
    globalThis.env.REACT_APP_PROFILE = value;
    expect(getProfile()).toBe(value);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(['Workbench', 'bogus'])(
    'treats %s as full and warns once',
    (value) => {
      globalThis.env.REACT_APP_PROFILE = value;
      expect(getProfile()).toBe('full');
      expect(getProfile()).toBe('full');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain(value);
    },
  );

  it('enables every feature in the full profile', () => {
    FEATURES.forEach((feature) => {
      expect(isFeatureEnabled(feature, 'full')).toBe(true);
    });
  });

  it('enables only the workbench in the workbench profile', () => {
    FEATURES.forEach((feature) => {
      expect(isFeatureEnabled(feature, 'workbench')).toBe(
        feature === 'workbench',
      );
    });
  });

  it('uses dt-automation only in the full profile', () => {
    expect(usesDtAutomation('full')).toBe(true);
    expect(usesDtAutomation('workbench')).toBe(false);
  });

  it('reads the configured profile when none is given', () => {
    globalThis.env.REACT_APP_PROFILE = 'workbench';
    expect(isFeatureEnabled('library')).toBe(false);
    expect(usesDtAutomation()).toBe(false);
  });
});
