import { FileType } from 'model/backend/interfaces/sharedInterfaces';

// Default project settings
export const GROUP_NAME = 'DTaaS';
export const DT_DIRECTORY = 'digital_twins';
export const COMMON_LIBRARY_PROJECT_NAME = 'common';
export const RUNNER_TAG = 'linux';
export const BRANCH_NAME = 'master';

// Pipeline execution settings
export const MAX_EXECUTION_TIME = 10 * 60 * 1000;
export const PIPELINE_POLL_INTERVAL = 5 * 1000;
export const DEBOUNCE_TIME = 250; // Duration before being able to click start again in ms

// ExecutionHistoryLoader
export const EXECUTION_CHECK_INTERVAL = 10000;

// Maps tabs to project folders (based on asset types)
export enum AssetTypes {
  Functions = 'functions',
  Models = 'models',
  Tools = 'tools',
  Data = 'data',
  'Digital Twins' = 'digital_twins',
  'Digital Twin' = 'digital_twin',
}

// Default initial files for new digital twins
export const defaultFiles = [
  { name: 'description.md', type: FileType.DESCRIPTION },
  { name: 'README.md', type: FileType.DESCRIPTION },
  { name: '.gitlab-ci.yml', type: FileType.CONFIGURATION },
];
