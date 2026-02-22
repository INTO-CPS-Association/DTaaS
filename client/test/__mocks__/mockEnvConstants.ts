const createMockURL = (path: string) => `https://example.com/${path}`;

export const mockAppURL = createMockURL('');
export const mockURLforDT = createMockURL('URL_DT');
export const mockURLforLIB = createMockURL('URL_LIB');
export const mockURLforWorkbench = createMockURL('URL_WORKBENCH');
export const mockClientID = 'mockedClientID';
export const mockAuthority = createMockURL('AUTHORITY');
export const mockRedirectURI = createMockURL('REDIRECT_URI');
export const mockLogoutRedirectURI = createMockURL('LOGOUT_REDIRECT_URI');

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
