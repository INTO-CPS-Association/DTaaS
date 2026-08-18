import LibraryAsset from 'src/libraryAsset';
import LibraryManager from 'src/libraryManager';
import { DigitalTwinData } from 'src/state/digitalTwin.slice';
import DigitalTwin from 'src/digitalTwin';
import FileHandler from 'src/fileHandler';
import DTAssets from 'src/DTAssets';
import { mockBackendInstance } from 'test/__mocks__/mockBackendData';
import { mockAuthority } from 'test/__mocks__/mockEnvConstants';
import { setEnvironmentStore, resetEnvironmentStore } from 'src/util/env';

export {
  mockBackendAPI,
  mockBackendInstance,
  mockGitlabClient,
} from 'test/__mocks__/mockBackendData';
export {
  mockAppURL,
  mockClientID,
  mockAuthority,
  mockRedirectURI,
  mockLogoutRedirectURI,
  mockGitLabScopes,
  mockUser,
  mockAuthState,
} from 'test/__mocks__/mockEnvConstants';

export type {
  mockUserType,
  mockAuthStateType,
  mockGitlabInstanceType,
} from 'test/__mocks__/mockEnvConstants';

beforeEach(() => {
  setEnvironmentStore({
    getState: () => ({
      environment: { AUTH_AUTHORITY: mockAuthority },
    }),
  });
});

afterEach(() => {
  resetEnvironmentStore();
});

jest.mock('src/gitlab/gitlabFactory', () => {
  const createGitlabInstance = jest.fn(() => mockBackendInstance);
  return {
    __esModule: true,
    createGitlabInstance,
    default: createGitlabInstance,
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
  v5: jest.fn(() => 'test-uuid-5678'),
  validate: jest.fn(() => true),
  version: jest.fn(() => 4),
}));

const createCommonMocks = () => ({
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
  getDescription: jest.fn(),
  getFullDescription: jest.fn(),
  getConfigFiles: jest.fn(),
});

export const mockLibraryManager: LibraryManager = {
  DTName: 'mockedDTName',
  backend: mockBackendInstance,
  assets: [],
  assetFiles: [],
  getAssets: jest.fn(),
  getAsset: jest.fn(),
  deleteAsset: jest.fn(),
  getFileContent: jest.fn(),
} as unknown as LibraryManager;

export const mockLibraryAsset: LibraryAsset = {
  name: 'Asset 1',
  path: 'path',
  type: 'Digital Twins',
  isPrivate: true,
  backend: mockBackendInstance,
  description: 'description',
  fullDescription: 'fullDescription',
  libraryManager: mockLibraryManager,
  configFiles: [],
  ...createCommonMocks(),
};

/**
 * Creates a mock DigitalTwinData object for Redux state
 * This creates clean serializable data for Redux, not DigitalTwin instances
 */
export const createMockDigitalTwinData = (dtName: string): DigitalTwinData => ({
  DTName: dtName,
  description: 'Test Digital Twin Description',
  fullDescription: 'Test README',
  jobLogs: [],
  pipelineCompleted: false,
  pipelineLoading: false,
  pipelineId: undefined,
  currentExecutionId: undefined,
  lastExecutionStatus: undefined,
  // Store only serializable data
  gitlabProjectId: 123,
});

const createAsyncMock = <T>(value: T) => jest.fn().mockResolvedValue(value);

export const mockFileHandler = {
  name: 'mockedName',
  backend: mockBackendInstance,
  createFile: jest.fn(),
  updateFile: jest.fn(),
  deleteDT: jest.fn(),
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
  getLibraryFileNames: jest.fn(),
  getLibraryConfigFileNames: jest.fn(),
  getFolders: jest.fn(),
} as unknown as FileHandler;

export const mockDTAssets = {
  DTName: 'mockedDTName',
  backend: mockBackendInstance,
  fileHandler: mockFileHandler,
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
  getDescription: jest.fn(),
  getFullDescription: jest.fn(),
  getConfigFiles: jest.fn(),
  buildCreateFileActions: jest.fn().mockReturnValue([]),
  buildTriggerAction: jest.fn().mockResolvedValue(null),
  createFiles: jest.fn(),
  getFilesFromAsset: jest.fn(),
  updateFileContent: jest.fn(),
  updateLibraryFileContent: jest.fn(),
  appendTriggerToPipeline: jest.fn(),
  removeTriggerFromPipeline: jest.fn(),
  delete: jest.fn(),
  getLibraryFileContent: jest.fn(),
  getLibraryConfigFileNames: jest.fn(),
  getFolders: jest.fn(),
} as unknown as DTAssets;

export const mockDigitalTwin: DigitalTwin = {
  DTName: 'mockedDTName',
  description: 'mockedDescription',
  fullDescription: 'mockedFullDescription',
  backend: mockBackendInstance,
  DTAssets: mockDTAssets,
  pipelineId: 1,
  lastExecutionStatus: 'mockedStatus',
  jobLogs: [{ jobName: 'job1', log: 'log1' }],
  pipelineLoading: false,
  pipelineCompleted: false,
  descriptionFiles: ['descriptionFile'],
  configFiles: ['configFile'],
  lifecycleFiles: ['lifecycleFile'],
  assetFiles: [
    { assetPath: 'assetPath', fileNames: ['assetFileName1', 'assetFileName2'] },
  ],
  currentExecutionId: 'test-execution-id',
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
  getDescription: jest.fn(),
  getFullDescription: jest.fn(),
  getConfigFiles: createAsyncMock(['configFile']),
  triggerPipeline: jest.fn(),
  execute: createAsyncMock(123),
  stop: jest.fn(),
  create: createAsyncMock('Success'),
  delete: jest.fn(),
  getDescriptionFiles: createAsyncMock(['descriptionFile']),
  getLifecycleFiles: createAsyncMock(['lifecycleFile']),
  prepareAllAssetFiles: jest.fn(),
  getAssetFiles: jest.fn(),
  updateExecutionStatus: jest.fn(),
  updateExecutionLogs: jest.fn(),
  getExecutionHistoryById: jest.fn(),
  getExecutionHistoryByDTName: jest.fn(),
} as unknown as DigitalTwin;

// Mock for execution history entries
export const mockExecutionHistoryEntry = {
  id: 'test-execution-id',
  dtName: 'mockedDTName',
  pipelineId: 123,
  timestamp: Date.now(),
  status: 'RUNNING',
  jobLogs: [],
};

// Mock for indexedDBService
export const mockIndexedDBService = {
  init: createAsyncMock(undefined),
  add: jest.fn().mockImplementation((entry) => Promise.resolve(entry.id)),
  update: createAsyncMock(undefined),
  getByDTName: createAsyncMock([]),
  getAll: createAsyncMock([]),
  getById: jest.fn().mockImplementation((entryId) =>
    Promise.resolve({
      ...mockExecutionHistoryEntry,
      id: entryId,
    }),
  ),
  delete: createAsyncMock(undefined),
  deleteByDTName: createAsyncMock(undefined),
};

// Helper function to reset all indexedDBService mocks
export const resetIndexedDBServiceMocks = () => {
  for (const mockValue of Object.values(mockIndexedDBService)) {
    if (
      typeof mockValue === 'function' &&
      typeof mockValue.mockClear === 'function'
    ) {
      mockValue.mockClear();
    }
  }
};

// Mock the initDigitalTwin function
jest.mock('src/util/init', () => ({
  ...jest.requireActual('src/util/init'),
  initDigitalTwin: createAsyncMock(mockDigitalTwin),
  fetchLibraryAssets: jest.fn().mockResolvedValue(undefined),
  fetchDigitalTwins: jest.fn().mockResolvedValue(undefined),
}));
