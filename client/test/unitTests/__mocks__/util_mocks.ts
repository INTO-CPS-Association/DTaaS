import { Asset } from 'components/asset/Asset';

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
    name: 'folderTest1.somethingsdfsdfsdf',
    description: 'Aenean placerat. In vulputate urna',
    path: `${testPath}/Functions/folderTest1.somethingsdfsdfsdf`,
  },
  {
    name: 'folderTest2.something',
    path: `${testPath}/Functions/folderTest2.something`,
  },
  {
    name: 'folderTest3',
    description:
      'Morbi leo mi, nonummy eget, tristique non, rhoncus non, leo. Nullam faucibus mi quis velit. Integer in sapien. Fusce tellus',
    path: `${testPath}/Functions/folderTest3`,
  },
  {
    name: 'folderTest4',
    description: 'Aenean placerat. In vulputate urna',
    path: `${testPath}/Functions/folderTest4`,
  },
  {
    name: 'folderTest5',
    description: undefined,
    path: `${testPath}/Functions/folderTest5`,
  },
  {
    name: 'filetest',
    description:
      'Morbi leo mi, nonummy eget, tristique non, rhoncus non, leo. Nullam faucibus mi quis velit. Integer in sapien. Fusce tellus',
    path: `${testPath}/Functions/filetest`,
  },
  {
    name: 'folderTest7',
    description: 'Aenean placerat. In vulputate urna',
    path: `${testPath}/Functions/folderTest7`,
  },
];

jest.mock('util/apiUtil', () => ({
  default: () => mockAssets,
}));
