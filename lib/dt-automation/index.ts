// Public exports for the DT Automation package.

// Core package exports
export type { Asset } from './src/Asset';
export { default as DigitalTwin, formatName } from './src/digitalTwin';

// GitLab configuration
export {
  BRANCH_NAME,
  COMMON_LIBRARY_PROJECT_NAME,
  DEBOUNCE_TIME,
  DT_DIRECTORY,
  EXECUTION_CHECK_INTERVAL,
  GROUP_NAME,
  PIPELINE_POLL_INTERVAL,
  RUNNER_TAG,
  defaultFiles,
} from './src/gitlab/digitalTwinConfig/constants';
export {
  getLoggingEnabled,
  getRemoteLoggingEnabled,
  setSettingsStore,
} from './src/gitlab/digitalTwinConfig/settingsUtility';

// GitLab execution
export { fetchJobLogs } from './src/gitlab/execution/logFetching';
export {
  delay,
  hasTimedOut,
  stopPipelines,
} from './src/gitlab/execution/pipelineCore';

// Measurement
export { default as DEFAULT_MEASUREMENT } from './src/gitlab/measure/constants';
export {
  attachSetters,
  detachSetters,
  getDefaultConfig,
  getTasks,
  measurementState,
  setMeasurementStore,
} from './src/gitlab/measure/measurement.execution';
export {
  handleBeforeUnload,
  handleUnload,
  purgeMeasurementData,
  restartMeasurement,
  setMeasurementDB,
  startMeasurement,
  stopAllPipelines,
} from './src/gitlab/measure/measurement.runner';
export { updateFrozenSettings } from './src/gitlab/measure/measurement.settings';
export type {
  Execution,
  ExecutionResult,
  MeasurementRecord,
  MeasurementSetters,
  Status,
  TimedTask,
  Trial,
} from './src/gitlab/measure/measurement.types';
export {
  downloadResultsJson,
  downloadTaskResultJson,
  getMeasurementStatus,
  getRunnerTags,
  getTotalTime,
  isTaskComplete,
  mergeExecutionStatus,
  secondsDifference,
} from './src/gitlab/measure/measurement.utils';

// GitLab types
export type {
  DTExecutionResult,
  JobLog,
} from './src/gitlab/types/executionHistory';

// Shared interfaces
export { ExecutionStatus } from './src/interfaces/execution';
export type { IExecutionHistory } from './src/interfaces/execution';
export { default as getFileTypeFromExtension } from './src/interfaces/fileTypeUtils';
export { FileType } from './src/interfaces/sharedInterfaces';
export type {
  FileState,
  LibraryConfigFile,
  ShowNotificationPayload,
} from './src/interfaces/sharedInterfaces';

// Library assets
export { default as LibraryAsset } from './src/libraryAsset';

// Application state
export {
  default as digitalTwinSlice,
  clearDigitalTwins,
  setDigitalTwin,
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
  setShouldFetchDigitalTwins,
  updateDescription,
} from './src/state/digitalTwin.slice';
export type { DigitalTwinData } from './src/state/digitalTwin.slice';
export {
  selectExecutionHistoryById,
  selectExecutionHistoryByDTName,
  selectExecutionHistoryEntries,
  selectExecutionHistoryError,
  selectExecutionHistoryLoading,
  selectSelectedExecution,
  selectSelectedExecutionId,
} from './src/state/executionHistory.selectors';
export {
  default as executionHistorySlice,
  checkRunningExecutions,
  clearExecutionHistoryForDT,
  fetchAllExecutionHistory,
  fetchExecutionHistory,
  removeExecution,
  setSelectedExecutionId,
  setStorageService,
  updateExecutionLogs,
  updateExecutionStatus,
} from './src/state/executionHistory.slice';

// Utility functions
export {
  createDigitalTwinFromData,
  extractDataFromDigitalTwin,
} from './src/util/digitalTwinAdapter';
export { setExecutionHistoryDB } from './src/util/digitalTwinExecutionHistory';
export { setPipelineExecutionDB } from './src/util/digitalTwinPipelineExecution';
export { setEnvironmentStore } from './src/util/env';
export {
  fetchDigitalTwins,
  fetchLibraryAssets,
  initDigitalTwin,
} from './src/util/init';

// Redux state
export {
  default as assetsSlice,
  deleteAsset,
  selectAssetByPathAndPrivacy,
  selectAssetsByTypeAndPrivacy,
} from './src/store/assets.slice';
export {
  default as cartSlice,
  addToCart,
  removeFromCart,
  clearCart,
} from './src/store/cart.slice';
export {
  default as environmentSlice,
  updateAuthority,
} from './src/store/environment.slice';
export type { EnvironmentState } from './src/store/environment.slice';
export {
  default as fileSlice,
  addOrUpdateFile,
  deleteFile,
  removeAllCreationFiles,
  removeAllModifiedFiles,
  renameFile,
  selectModifiedFiles,
} from './src/store/file.slice';
export {
  default as libraryConfigFilesSlice,
  addOrUpdateLibraryFile,
  initializeLibraryFile,
  removeAllFiles,
  removeAllModifiedLibraryFiles,
  selectModifiedLibraryFiles,
} from './src/store/libraryConfigFiles.slice';
