import LibraryManager from 'model/backend/libraryManager';
import {
  mockBackendInstance as backend,
  mockFileHandler,
  mockDigitalTwin,
} from 'test/__mocks__/global_mocks';
import 'test/preview/__mocks__/constants.mock';
import { DigitalTwinData } from 'model/backend/state/digitalTwin.slice';

// Re-export imported types and mocks for convenience
export type {
  mockUserType,
  mockAuthStateType,
  mockGitlabInstanceType,
} from 'test/__mocks__/global_mocks';
export { mockUser, mockAuthState } from 'test/__mocks__/global_mocks';
export {
  mockFileHandler,
  mockDTAssets,
  mockDigitalTwin,
} from 'test/__mocks__/global_mocks';

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

export const mockLibraryManager: LibraryManager = {
  assetName: 'mockedAssetName',
  backend,
  fileHandler: mockFileHandler,
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
} as unknown as LibraryManager;

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

const createAsyncMock = <T>(value: T) => jest.fn().mockResolvedValue(value);

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
