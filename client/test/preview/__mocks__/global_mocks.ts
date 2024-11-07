import { Gitlab } from '@gitbeaker/core';
import GitlabInstance from 'preview/util/gitlab';
import DigitalTwin from 'preview/util/digitalTwin';
import FileHandler from 'preview/util/fileHandler';

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
  subfolders: [],
  projectId: 1,
  triggerToken: 'mock trigger token',
  init: jest.fn(),
  getProjectId: jest.fn(),
  getTriggerToken: jest.fn(),
  getDTSubfolders: jest.fn(),
  executionLogs: jest.fn(),
  getPipelineJobs: jest.fn(),
  getJobTrace: jest.fn(),
  getPipelineStatus: jest.fn(),
};

export const mockFileHandler: FileHandler = {
  DTName: 'mockedDTName',
  gitlabInstance: mockGitlabInstance,
  getFileContent: jest.fn(),
  updateFileContent: jest.fn(),
  getFileNames: jest.fn(),
  isValidFileType: jest.fn(),
  createFile: jest.fn(),
  createFiles: jest.fn(),
  appendTriggerToPipeline: jest.fn(),
  removeTriggerFromPipeline: jest.fn(),
} as unknown as FileHandler;

export const mockDigitalTwin: DigitalTwin = {
  DTName: 'mockedDTName',
  description: 'mockedDescription',
  fullDescription: 'mockedFullDescription',
  gitlabInstance: mockGitlabInstance,
  fileHandler: mockFileHandler,
  pipelineId: 1,
  lastExecutionStatus: 'mockedStatus',
  jobLogs: [{ jobName: 'job1', log: 'log1' }],
  pipelineLoading: false,
  pipelineCompleted: false,
  descriptionFiles: ['descriptionFile'],
  lifecycleFiles: ['lifecycleFile'],
  configFiles: ['configFile'],

  getDescription: jest.fn(),
  getFullDescription: jest.fn(),
  execute: jest.fn(),
  triggerPipeline: jest.fn(),
  stop: jest.fn(),
  create: jest.fn().mockResolvedValue('Success'),
  delete: jest.fn(),
  getDescriptionFiles: jest.fn().mockResolvedValue(['descriptionFile']),
  getLifecycleFiles: jest.fn().mockResolvedValue(['lifecycleFile']),
  getConfigFiles: jest.fn().mockResolvedValue(['configFile']),
} as unknown as DigitalTwin;

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
