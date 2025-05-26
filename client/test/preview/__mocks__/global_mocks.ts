import { Gitlab } from '@gitbeaker/core';
import { BackendInterface } from 'model/backend/gitlab/interfaces';
import DigitalTwin from 'preview/util/digitalTwin';
import FileHandler from 'preview/util/fileHandler';
import DTAssets from 'preview/util/DTAssets';
import LibraryManager from 'preview/util/libraryManager';

export const mockAppURL = 'https://example.com/';
export const mockURLforDT = 'https://example.com/URL_DT';
export const mockURLforLIB = 'https://example.com/URL_LIB';
export const mockURLforWorkbench = 'https://example.com/URL_WORKBENCH';
export const mockClientID = 'mockedClientID';
export const mockAuthority = 'https://example.com/AUTHORITY';
export const mockRedirectURI = 'https://example.com/REDIRECT_URI';
export const mockLogoutRedirectURI = 'https://example.com/LOGOUT_REDIRECT_URI';
export const mockGitLabScopes = 'example scopes';

export type mockUserType = {
  access_token: string;
  profile: {
    groups: string[] | string | undefined;
    picture: string | undefined;
    preferred_username: string | undefined;
    profile: string | undefined;
  };
};

export const mockUser: mockUserType = {
  access_token: 'example_token',
  profile: {
    groups: 'group-one',
    picture: 'pfp.jpg',
    preferred_username: 'username',
    profile: 'example/username',
  },
};

export type mockAuthStateType = {
  user?: mockUserType | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeNavigator?: string;
  error?: Error;
};

export const mockAuthState: mockAuthStateType = {
  isAuthenticated: true,
  isLoading: false,
  user: mockUser,
};

export type mockGitlabInstanceType = {
  projectId: number;
  triggerToken: string;
  getPipelineStatus: jest.Mock;
};

export const mockGitlabInstance: BackendInterface = {
  projectName: 'mockedUsername',
  api: new Gitlab({
    host: 'mockedHost',
    token: 'mockedToken',
    requesterFn: jest.fn(),
  }),
  logs: [],
  projectId: 1,
  commonProjectId: 3,
  triggerToken: 'mock trigger token',
  init: jest.fn(),
  getProjectIds: jest.fn(),
  getTriggerToken: jest.fn(),
  executionLogs: jest.fn(),
  getPipelineJobs: jest.fn(),
  getJobTrace: jest.fn(),
  getPipelineStatus: jest.fn(),
};

export const mockFileHandler: FileHandler = {
  name: 'mockedName',
  gitlabInstance: mockGitlabInstance,
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
  backend: mockGitlabInstance,
  fileHandler: mockFileHandler,
  createFiles: jest.fn(),
  getFilesFromAsset: jest.fn(),
  updateFileContent: jest.fn(),
  updateLibraryFileContent: jest.fn(),
  appendTriggerToPipeline: jest.fn(),
  removeTriggerFromPipeline: jest.fn(),
  delete: jest.fn(),
  getFileContent: jest.fn(),
  getLibraryFileContent: jest.fn(),
  getFileNames: jest.fn(),
  getLibraryConfigFileNames: jest.fn(),
  getFolders: jest.fn(),
};

export const mockLibraryManager: LibraryManager = {
  assetName: 'mockedAssetName',
  gitlabInstance: mockGitlabInstance,
  fileHandler: mockFileHandler,
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
};

export const mockDigitalTwin: DigitalTwin = {
  DTName: 'mockedDTName',
  description: 'mockedDescription',
  fullDescription: 'mockedFullDescription',
  backend: mockGitlabInstance,
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

  getDescription: jest.fn(),
  getFullDescription: jest.fn(),
  triggerPipeline: jest.fn(),
  execute: jest.fn(),
  stop: jest.fn(),
  create: jest.fn().mockResolvedValue('Success'),
  delete: jest.fn(),
  getDescriptionFiles: jest.fn().mockResolvedValue(['descriptionFile']),
  getLifecycleFiles: jest.fn().mockResolvedValue(['lifecycleFile']),
  getConfigFiles: jest.fn().mockResolvedValue(['configFile']),
  prepareAllAssetFiles: jest.fn(),
  getAssetFiles: jest.fn(),
} as unknown as DigitalTwin;

export const mockLibraryAsset = {
  name: 'Asset 1',
  path: 'path',
  type: 'Digital Twins',
  isPrivate: true,
  gitlabInstance: mockGitlabInstance,
  description: 'description',
  fullDescription: 'fullDescription',
  libraryManager: mockLibraryManager,
  configFiles: [],

  getDescription: jest.fn(),
  getFullDescription: jest.fn(),
  getConfigFiles: jest.fn(),
};

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
  getWorkbenchLinkValues: () => [
    { key: '1', link: 'link1' },
    { key: '2', link: 'link2' },
    { key: '3', link: 'link3' },
  ],
}));

// TODO: These should match the above values, such as mockAppUrl.
window.env = {
  ...window.env,
  REACT_APP_ENVIRONMENT: 'test',
  REACT_APP_URL: 'https://foo.com',
  REACT_APP_URL_BASENAME: 'mock_url_basename',
  REACT_APP_URL_DTLINK: '/lab',
  REACT_APP_URL_LIBLINK: '',
  REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
  REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
  REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
  REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',
  REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
  REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

  REACT_APP_CLIENT_ID: 'abc123',
  REACT_APP_AUTH_AUTHORITY: 'https://foo.git.com',
  REACT_APP_REDIRECT_URI: 'https://bar.com',
  REACT_APP_LOGOUT_REDIRECT_URI: 'https://foobar.com',
  REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
};
