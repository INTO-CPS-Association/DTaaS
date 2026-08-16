import {
  useGroupName,
  useCommonLibraryProjectName,
  useDTDirectory,
  useRunnerTag,
  useBranchName,
} from 'util/settingsUseHooks';
import { DEFAULT_SETTINGS } from 'store/settings.slice';
import { renderHook } from '@testing-library/react';
import { useSelector } from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockedUseSelector = useSelector as unknown as jest.Mock;

describe('settingsUseHooks', () => {
  let settings: typeof DEFAULT_SETTINGS;

  function updateSettingsMock(
    key: keyof typeof DEFAULT_SETTINGS,
    value: string,
  ) {
    settings = { ...settings, [key]: value };
  }

  beforeEach(() => {
    settings = DEFAULT_SETTINGS;
    mockedUseSelector.mockImplementation(
      (selector) => selector({ settings }), // Mock reads settings by reference, so updates in tests are reflected automatically
    );
  });

  it('useGroupName returns custom', () => {
    updateSettingsMock('GROUP_NAME', 'testGroup1');
    updateSettingsMock('COMMON_LIBRARY_PROJECT_NAME', 'testCommon1');
    updateSettingsMock('DT_DIRECTORY', 'testDT1');
    updateSettingsMock('RUNNER_TAG', 'testRunner1');
    updateSettingsMock('BRANCH_NAME', 'testBranch1');

    const groupName = renderHook(() => useGroupName()).result.current;
    const commonLib = renderHook(() => useCommonLibraryProjectName()).result
      .current;
    const dtDir = renderHook(() => useDTDirectory()).result.current;
    const runnerTag = renderHook(() => useRunnerTag()).result.current;
    const branchName = renderHook(() => useBranchName()).result.current;

    expect(groupName).toBe('testGroup1');
    expect(commonLib).toBe('testCommon1');
    expect(dtDir).toBe('testDT1');
    expect(runnerTag).toBe('testRunner1');
    expect(branchName).toBe('testBranch1');
  });

  it('return correct default values from hooks', () => {
    const groupName = renderHook(() => useGroupName()).result.current;
    const commonLib = renderHook(() => useCommonLibraryProjectName()).result
      .current;
    const dtDir = renderHook(() => useDTDirectory()).result.current;
    const runnerTag = renderHook(() => useRunnerTag()).result.current;
    const branchName = renderHook(() => useBranchName()).result.current;

    expect(groupName).toBe(DEFAULT_SETTINGS.GROUP_NAME);
    expect(commonLib).toBe(DEFAULT_SETTINGS.COMMON_LIBRARY_PROJECT_NAME);
    expect(dtDir).toBe(DEFAULT_SETTINGS.DT_DIRECTORY);
    expect(runnerTag).toBe(DEFAULT_SETTINGS.RUNNER_TAG);
    expect(branchName).toBe(DEFAULT_SETTINGS.BRANCH_NAME);
  });
});
