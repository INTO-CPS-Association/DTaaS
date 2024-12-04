import { Gitlab } from '@gitbeaker/core';
import GitlabInstance from 'preview/util/gitlab';
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

export const mockGitlabInstance: GitlabInstance = {
  username: 'mockedUsername',
  api: new Gitlab({
    host: 'mockedHost',
    token: 'mockedToken',
    requesterFn: jest.fn(),
  }),
  logs: [],
  projectId: 1,
  triggerToken: 'mock trigger token',
  init: jest.fn(),
  getProjectId: jest.fn(),
  getTriggerToken: jest.fn(),
  getDTSubfolders: jest.fn(),
  getLibrarySubfolders: jest.fn(),
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
  gitlabInstance: mockGitlabInstance,
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
  gitlabInstance: mockGitlabInstance,
  DTAssets: mockDTAssets,
  pipelineId: 1,
  lastExecutionStatus: 'mockedStatus',
  jobLogs: [{ jobName: 'job1', log: 'log1' }],
  pipelineLoading: false,
  pipelineCompleted: false,
  descriptionFiles: ['descriptionFile'],
  configFiles: ['configFile'],
  lifecycleFiles: ['lifecycleFile'],
  assetFiles: [{ assetPath: 'assetPath', fileNames: ['assetFileName1', 'assetFileName2'] }],

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
  name: 'asset1',
  path: 'path',
  type: 'functions',
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
