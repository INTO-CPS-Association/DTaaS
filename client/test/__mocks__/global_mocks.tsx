import LibraryAsset from 'model/backend/libraryAsset';
import LibraryManager from 'model/backend/libraryManager';
import { DigitalTwinData } from 'model/backend/state/digitalTwin.slice';
import DigitalTwin from 'model/backend/digitalTwin';
import FileHandler from 'model/backend/fileHandler';
import DTAssets from 'model/backend/DTAssets';
import { mockBackendInstance } from 'test/__mocks__/mockBackendData';
import {
  mockAppURL,
  mockURLforDT,
  mockURLforLIB,
  mockURLforWorkbench,
  mockClientID,
  mockAuthority,
  mockRedirectURI,
  mockLogoutRedirectURI,
  mockGitLabScopes,
} from 'test/__mocks__/mockEnvConstants';

export {
  mockBackendAPI,
  mockBackendInstance,
  mockGitlabClient,
} from 'test/__mocks__/mockBackendData';
export {
  mockAppURL,
  mockURLforDT,
  mockURLforLIB,
  mockURLforWorkbench,
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

jest.mock('util/envUtil', () => ({
  ...jest.requireActual('util/envUtil'),
  useAppURL: () => mockAppURL,
  useURLforDT: () => mockURLforDT,
  useURLforLIB: () => mockURLforLIB,
  getClientID: () => mockClientID,
  getAuthority: () => mockAuthority,
  getRedirectURI: () => mockRedirectURI,
  getLogoutRedirectURI: () => mockLogoutRedirectURI,
  getGitLabScopes: () => mockGitLabScopes,
  getURLforWorkbench: () => mockURLforWorkbench,
  useWorkbenchLinkValues: () => [
    { key: '1', link: 'link1' },
    { key: '2', link: 'link2' },
    { key: '3', link: 'link3' },
  ],
}));

globalThis.env = {
  ...globalThis.env,
  REACT_APP_ENVIRONMENT: 'test',
  REACT_APP_URL: mockAppURL,
  REACT_APP_URL_BASENAME: 'mock_url_basename',
  REACT_APP_URL_DTLINK: '/lab',
  REACT_APP_URL_LIBLINK: '',
  REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?foo=bar',
  REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
  REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
  REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',
  REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
  REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

  REACT_APP_CLIENT_ID: mockClientID,
  REACT_APP_AUTH_AUTHORITY: mockAuthority,
  REACT_APP_REDIRECT_URI: mockRedirectURI,
  REACT_APP_LOGOUT_REDIRECT_URI: mockLogoutRedirectURI,
  REACT_APP_GITLAB_SCOPES: mockGitLabScopes,
};

jest.mock('model/backend/gitlab/gitlabFactory', () => ({
  createGitlabInstance: jest.fn(() => mockBackendInstance),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
  v5: jest.fn(() => 'test-uuid-5678'),
  validate: jest.fn(() => true),
  version: jest.fn(() => 4),
}));

jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => (
    <div data-testid="syntax-highlighter">{children}</div>
  ),
  Light: ({ children }: { children: string }) => (
    <div data-testid="syntax-highlighter">{children}</div>
  ),
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  materialDark: {},
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
} as unknown as LibraryAsset;

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

const createAsyncMock = <T,>(value: T) => jest.fn().mockResolvedValue(value);

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
