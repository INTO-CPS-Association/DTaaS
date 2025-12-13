import { Gitlab } from '@gitbeaker/core';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import GitlabAPI from 'model/backend/gitlab/backend';

export const mockAppURL = 'https://example.com/';
export const mockURLforDT = 'https://example.com/URL_DT';
export const mockURLforLIB = 'https://example.com/URL_LIB';
export const mockURLforWorkbench = 'https://example.com/URL_WORKBENCH';
export const mockClientID = 'mockedClientID';
export const mockAuthority = 'https://example.com/AUTHORITY';
export const mockRedirectURI = 'https://example.com/REDIRECT_URI';
export const mockLogoutRedirectURI = 'https://example.com/LOGOUT_REDIRECT_URI';
export const mockGitLabScopes = 'openid profile read_user read_repository api';

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

export const mockGitlabClient = new Gitlab({
  host: 'mockedHost',
  token: 'mockedToken',
  requesterFn: jest.fn(),
});

export const mockBackendAPI = {
  startPipeline: jest.fn(),
  cancelPipeline: jest.fn(),
  createRepositoryFile: jest.fn(),
  editRepositoryFile: jest.fn(),
  removeRepositoryFile: jest.fn(),
  getRepositoryFileContent: jest.fn(),
  listRepositoryFiles: jest.fn(),
  getGroupByName: jest.fn(),
  listGroupProjects: jest.fn(),
  listPipelineJobs: jest.fn(),
  getJobLog: jest.fn(),
  getPipelineStatus: jest.fn(),
  getTriggerToken: jest.fn(),
} as unknown as GitlabAPI;

export const mockBackendInstance: BackendInterface = {
  projectName: 'mockedUsername',
  api: mockBackendAPI,
  logs: [],
  init: jest.fn(),
  getProjectId: jest.fn().mockReturnValue(1),
  getCommonProjectId: jest.fn().mockReturnValue(3),
  getExecutionLogs: jest.fn(),
  getPipelineJobs: jest.fn(),
  startPipeline: jest.fn(),
  getJobTrace: jest.fn(),
  getPipelineStatus: jest.fn(),
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
