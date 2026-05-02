import type { RootState } from 'store/storeTypes';

/**
 * Non-hook getters for settings stored in the Redux store.
 *
 * - Default values are defined in ./constants.ts
 * - Hook variants are in util/settingsUseHooks.ts
 * - Settings can be overridden by the user in the Settings tab
 */

type StoreReader = { getState: () => RootState };

let _store: StoreReader | null = null;

export function setSettingsStore(store: StoreReader): void {
  _store = store;
}

function getStore(): StoreReader {
  if (!_store)
    throw new Error(
      'Settings store not initialized. Call setSettingsStore() first.',
    );
  return _store;
}

export const getGroupName = (): string =>
  getStore().getState().settings.GROUP_NAME;
export const getDTDirectory = (): string =>
  getStore().getState().settings.DT_DIRECTORY;
export const getCommonLibraryProjectName = (): string =>
  getStore().getState().settings.COMMON_LIBRARY_PROJECT_NAME;
export const getRunnerTag = (): string =>
  getStore().getState().settings.RUNNER_TAG;
export const getBranchName = (): string =>
  getStore().getState().settings.BRANCH_NAME;
