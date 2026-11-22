// Runs in the temporary consumer project and uses the installed package the
// way a Node.js application does, with in-memory services in place of browser storage.
import assert from 'node:assert/strict';

const RESULTS_STORAGE_KEY = 'measurementResults';
const savedResults = new Map([[RESULTS_STORAGE_KEY, '[]']]);
let purgeCount = 0;

const packageName = process.argv[2];
const {
  BRANCH_NAME,
  COMMON_LIBRARY_PROJECT_NAME,
  DT_DIRECTORY,
  GROUP_NAME,
  RUNNER_TAG,
  buildResultsExport,
  formatName,
  handleBeforeUnload,
  measurementState,
  purgeMeasurementData,
  setEnvironmentStore,
  setMeasurementDB,
  setMeasurementResultsStorage,
  setMeasurementStore,
  setSettingsStore,
} = await import(packageName);

const settings = {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
  loggingEnabled: false,
  remoteLoggingEnabled: false,
};
const measurementSettings = {
  ...settings,
  trials: 1,
  secondaryRunnerTag: RUNNER_TAG,
  primaryDTName: 'hello-world',
  secondaryDTName: 'hello-world',
  disabledTaskNames: [],
};
const noop = () => undefined;

const registerStores = () => {
  setEnvironmentStore({
    getState: () => ({
      environment: { AUTH_AUTHORITY: 'https://gitlab.example.com' },
    }),
  });
  setSettingsStore({ getState: () => ({ settings }) });
  setMeasurementStore({
    getState: () => ({ settings: measurementSettings }),
    restoreRunnerTag: noop,
    restoreBranchName: noop,
    restoreSecondaryRunnerTag: noop,
    showSnackbar: noop,
  });
};

const registerServices = () => {
  setMeasurementDB({
    add: async () => 'measurement',
    purge: async () => {
      purgeCount += 1;
    },
  });
  setMeasurementResultsStorage({
    getItem: (key) => savedResults.get(key) ?? null,
    setItem: (key, value) => {
      savedResults.set(key, value);
    },
    removeItem: (key) => {
      savedResults.delete(key);
    },
  });
};

const checkFormatName = () => {
  assert.equal(formatName('digital-twin'), 'Digital Twin');
};

const checkRestore = () => {
  assert.deepEqual(measurementState.results, []);
};

const checkExport = () => {
  const exported = buildResultsExport([]);
  assert.equal(exported.mimeType, 'application/json');
  assert.deepEqual(JSON.parse(exported.content), {
    totalTimeSeconds: null,
    tasks: [],
  });
};

const checkPurge = async () => {
  await purgeMeasurementData();
  assert.equal(purgeCount, 1);
  assert.equal(savedResults.has(RESULTS_STORAGE_KEY), false);
  assert.ok(measurementState.results.length > 0);
  assert.ok(
    measurementState.results.every((task) => task.Status === 'NOT_STARTED'),
  );
};

const checkBeforeUnload = () => {
  handleBeforeUnload(
    { preventDefault: () => assert.fail('No measurement is running') },
    { current: false },
  );
};

checkFormatName();
registerStores();
registerServices();
checkRestore();
checkExport();
await checkPurge();
checkBeforeUnload();
