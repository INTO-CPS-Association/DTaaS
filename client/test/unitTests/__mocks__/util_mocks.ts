import { Asset } from 'models/Asset';

export const mockURLforDT = 'https://example.com/URL_DT';
export const mockURLforLIB = 'https://example.com/URL_LIB';
export const mockURLforWorkbench = 'https://example.com/URL_WORKBENCH';
export const mockClientID = 'mockedClientID';
export const mockAuthority = 'https://example.com/AUTHORITY';
export const mockRedirectURI = 'https://example.com/REDIRECT_URI';
export const mockLogoutRedirectURI = 'https://example.com/LOGOUT_REDIRECT_URI';
export const mockGitLabScopes = 'example scopes';
export const mockGitLabGroup = 'group';

jest.mock('util/envUtil', () => ({
  useURLforDT: () => mockURLforDT,
  useURLforLIB: () => mockURLforLIB,
  getClientID: () => mockClientID,
  getAuthority: () => mockAuthority,
  getRedirectURI: () => mockRedirectURI,
  getLogoutRedirectURI: () => mockLogoutRedirectURI,
  getGitLabScopes: () => mockGitLabScopes,
  useWorkbenchLinkValues: () => [
    { key: '1', link: 'link1' },
    { key: '2', link: 'link2' },
    { key: '3', link: 'link3' },
  ],
  getGitlabGroup: () => mockGitLabGroup,
}));

export const testPath = '/path';
export const mockAssets: Asset[] = [
  {
    name: 'file1',
    path: `${testPath}/file1`,
    isDir: false,
  },
  {
    name: 'file2',
    path: `${testPath}/file2`,
    isDir: false,
  },
  {
    name: 'dir1',
    path: `${testPath}/dir1`,
    isDir: true,
  },
];

jest.mock('util/apiUtil', () => ({
  default: () => mockAssets,
}));
