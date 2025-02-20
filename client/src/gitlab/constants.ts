// gitlab.ts
export const GROUP_NAME = 'DTaaS';
export const DT_DIRECTORY = 'digital_twins';
export const COMMON_LIBRARY_PROJECT_ID = 3;

// digitalTwin.ts
export const RUNNER_TAG = 'linux';
export const formatName = (name: string) =>
    name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());