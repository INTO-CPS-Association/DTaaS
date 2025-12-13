import DigitalTwin from 'model/backend/digitalTwin';
import FileHandler from 'model/backend/fileHandler';
import DTAssets from 'model/backend/DTAssets';
import LibraryManager from 'model/backend/libraryManager';
import { mockBackendInstance as backend } from 'test/__mocks__/global_mocks';
import 'test/preview/__mocks__/constants.mock';
import { DigitalTwinData } from 'model/backend/state/digitalTwin.slice';

// Re-export imported types and mocks for convenience
export type {
  mockUserType,
  mockAuthStateType,
  mockGitlabInstanceType,
} from 'test/__mocks__/global_mocks';
export { mockUser, mockAuthState } from 'test/__mocks__/global_mocks';

const createMockURL = (path: string) => `https://example.com/${path}`;

export const mockAppURL = createMockURL('');
export const mockURLforDT = createMockURL('URL_DT');
export const mockURLforLIB = createMockURL('URL_LIB');
export const mockURLforWorkbench = createMockURL('URL_WORKBENCH');
export const mockAuthority = createMockURL('AUTHORITY');
export const mockRedirectURI = createMockURL('REDIRECT_URI');
export const mockLogoutRedirectURI = createMockURL('LOGOUT_REDIRECT_URI');
export const mockGitLabScopes = 'example scopes';

const createCommonMocks = () => ({
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
  getDescription: jest.fn(),
  getFullDescription: jest.fn(),
  getConfigFiles: jest.fn(),
});

export const mockFileHandler: FileHandler = {
  name: 'mockedName',
  backend,
  createFile: jest.fn(),
  updateFile: jest.fn(),
  deleteDT: jest.fn(),
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
  getLibraryFileNames: jest.fn(),
  getLibraryConfigFileNames: jest.fn(),
  getFolders: jest.fn(),
};

export const mockDTAssets: DTAssets = {
  DTName: 'mockedDTName',
  backend,
  fileHandler: mockFileHandler,
  ...createCommonMocks(),
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
};

export const mockLibraryManager: LibraryManager = {
  assetName: 'mockedAssetName',
  backend,
  fileHandler: mockFileHandler,
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
};

const createAsyncMock = <T>(value: T) => jest.fn().mockResolvedValue(value);

export const mockDigitalTwin: DigitalTwin = {
  DTName: 'mockedDTName',
  description: 'mockedDescription',
  fullDescription: 'mockedFullDescription',
  backend,
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

  ...createCommonMocks(),
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

export const mockLibraryAsset = {
  name: 'Asset 1',
  path: 'path',
  type: 'Digital Twins',
  isPrivate: true,
  backend,
  description: 'description',
  fullDescription: 'fullDescription',
  libraryManager: mockLibraryManager,
  configFiles: [],
  ...createCommonMocks(),
};

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
  getById: jest.fn().mockImplementation((id) =>
    Promise.resolve({
      ...mockExecutionHistoryEntry,
      id,
    }),
  ),
  delete: createAsyncMock(undefined),
  deleteByDTName: createAsyncMock(undefined),
};

// Helper function to reset all indexedDBService mocks
export const resetIndexedDBServiceMocks = () => {
  for (const mock of Object.values(mockIndexedDBService)) {
    if (typeof mock === 'function' && typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  }
};

/**
 * Creates mock DigitalTwinData for Redux state following the adapter pattern
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

// Mock sessionStorage for tests
Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: jest.fn((key: string) => {
      const mockValues: { [key: string]: string } = {
        username: 'testuser',
        access_token: 'test_token',
      };
      return mockValues[key] || null;
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

// Mock the initDigitalTwin function
jest.mock('model/backend/util/init', () => ({
  ...jest.requireActual('model/backend/util/init'),
  initDigitalTwin: createAsyncMock(mockDigitalTwin),
  fetchLibraryAssets: jest.fn(),
  fetchDigitalTwins: jest.fn(),
}));
