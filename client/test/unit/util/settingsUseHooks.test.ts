import { renderHook } from '@testing-library/react';
import { useSelector } from 'react-redux';
import {
  useGroupName,
  useDTDirectory,
  useCommonLibraryProjectName,
  useRunnerTag,
  useBranchName,
  useMeasurementTrials,
  useMeasurementSecondaryRunnerTag,
} from 'util/settingsUseHooks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockedUseSelector = useSelector as unknown as jest.Mock;

const mockState = {
  settings: {
    GROUP_NAME: 'test-group',
    DT_DIRECTORY: 'test-dt-dir',
    COMMON_LIBRARY_PROJECT_NAME: 'test-common',
    RUNNER_TAG: 'linux',
    BRANCH_NAME: 'main',
    trials: 5,
    secondaryRunnerTag: 'windows',
  },
};

describe('settingsUseHooks', () => {
  beforeEach(() => {
    mockedUseSelector.mockImplementation(
      (selector: (state: typeof mockState) => unknown) => selector(mockState),
    );
  });

  it('useGroupName returns GROUP_NAME', () => {
    const { result } = renderHook(() => useGroupName());
    expect(result.current).toBe('test-group');
  });

  it('useDTDirectory returns DT_DIRECTORY', () => {
    const { result } = renderHook(() => useDTDirectory());
    expect(result.current).toBe('test-dt-dir');
  });

  it('useCommonLibraryProjectName returns COMMON_LIBRARY_PROJECT_NAME', () => {
    const { result } = renderHook(() => useCommonLibraryProjectName());
    expect(result.current).toBe('test-common');
  });

  it('useRunnerTag returns RUNNER_TAG', () => {
    const { result } = renderHook(() => useRunnerTag());
    expect(result.current).toBe('linux');
  });

  it('useBranchName returns BRANCH_NAME', () => {
    const { result } = renderHook(() => useBranchName());
    expect(result.current).toBe('main');
  });

  it('useMeasurementTrials returns trials count', () => {
    const { result } = renderHook(() => useMeasurementTrials());
    expect(result.current).toBe(5);
  });

  it('useMeasurementSecondaryRunnerTag returns secondary runner tag', () => {
    const { result } = renderHook(() => useMeasurementSecondaryRunnerTag());
    expect(result.current).toBe('windows');
  });
});
