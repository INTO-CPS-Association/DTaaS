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

jest.mock('route/config/Verify', () => ({
  ...jest.requireActual('route/config/Verify'),
  getValidationResults: jest.fn(),
}));
