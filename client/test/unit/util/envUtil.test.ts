import {
  useURLforDT,
  useURLforLIB,
  useWorkbenchLinkValues,
  cleanURL,
  useURLbasename,
} from 'util/envUtil';
import { useSelector } from 'react-redux';

jest.unmock('util/envUtil');

describe('envUtil', () => {
  const testDT = 'testDT';
  const testLIB = '';
  const testAppURL = 'https://example.com';
  const testBasename = 'testBasename';
  const testUsername = 'username';
  const testAppID = 'testAppID';
  const testAuthority = 'https://example.com';
  const testScopes = 'testScopes';
  const testRedirect = 'https://example.com/redirect';
  const testLogoutRedirect = 'https://example.com';

  const testServices = {
    desktop: {
      name: 'Desktop',
      description: 'Virtual Desktop',
      endpoint: 'tools/vnc',
    },
    vscode: {
      name: 'VS Code',
      description: 'VS Code IDE',
      endpoint: 'tools/vscode',
    },
    lab: { name: 'Jupyter Lab', description: 'Jupyter Lab', endpoint: 'lab' },
    notebook: {
      name: 'Jupyter Notebook',
      description: 'Jupyter Notebook',
      endpoint: '',
    },
  };

  globalThis.env = {
    REACT_APP_ENVIRONMENT: 'test',
    REACT_APP_URL: testAppURL,
    REACT_APP_URL_BASENAME: testBasename,
    REACT_APP_URL_DTLINK: testDT,
    REACT_APP_URL_LIBLINK: testLIB,
    REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
    REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

    REACT_APP_CLIENT_ID: testAppID,
    REACT_APP_AUTH_AUTHORITY: testAuthority,
    REACT_APP_GITLAB_SCOPES: testScopes,
    REACT_APP_REDIRECT_URI: testRedirect,
    REACT_APP_LOGOUT_REDIRECT_URI: testLogoutRedirect,
  };

  const mockState = {
    auth: { userName: testUsername },
    workbench: { services: testServices, status: 'succeeded' },
  };

  beforeEach(() => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: typeof mockState) => unknown) => selector(mockState),
    );
  });

  test('GetURL should return the correct environment variables', () => {
    expect(useURLforDT()).toBe(
      `${testAppURL}/${testBasename}/${testUsername}/${testDT}`,
    );
    expect(useURLforLIB()).toBe(
      `${testAppURL}/${testBasename}/${testUsername}/${testLIB}`,
    );
    expect(useURLbasename()).toBe(testBasename);
  });

  test('GetWorkbenchLinkValues should return an array', () => {
    const result = useWorkbenchLinkValues();
    expect(Array.isArray(result)).toBe(true);
  });

  // Test that array elements have the expected shape
  test('GetWorkbenchLinkValues should return an array of objects with "key" and "link" properties', () => {
    const result = useWorkbenchLinkValues();
    expect(
      result.every(
        (el) => typeof el.key === 'string' && typeof el.link === 'string',
      ),
    ).toBe(true);
  });

  // Test that the workspace service links are correctly constructed
  it('should construct workspace service links correctly', () => {
    const result = useWorkbenchLinkValues();
    const appURL = `${testAppURL}/${testBasename}`;

    const desktopEntry = result.find((el) => el.key === 'VNCDESKTOP');
    expect(desktopEntry?.link).toBe(
      `${appURL}/${testUsername}/${testServices.desktop.endpoint}`,
    );

    const vscodeEntry = result.find((el) => el.key === 'VSCODE');
    expect(vscodeEntry?.link).toBe(
      `${appURL}/${testUsername}/${testServices.vscode.endpoint}`,
    );

    const labEntry = result.find((el) => el.key === 'JUPYTERLAB');
    expect(labEntry?.link).toBe(
      `${appURL}/${testUsername}/${testServices.lab.endpoint}`,
    );
  });

  // Test that preview links come from env vars unchanged
  it('should include LIBRARY_PREVIEW and DT_PREVIEW from env vars', () => {
    const result = useWorkbenchLinkValues();

    const libraryPreview = result.find((el) => el.key === 'LIBRARY_PREVIEW');
    expect(libraryPreview?.link).toBe('/preview/library');

    const dtPreview = result.find((el) => el.key === 'DT_PREVIEW');
    expect(dtPreview?.link).toBe('/preview/digitaltwins');
  });

  // Test that no workspace links appear when services are empty
  it('should return only preview links when services are empty', () => {
    const emptyState = {
      auth: { userName: testUsername },
      workbench: { services: {}, status: 'idle' },
    };
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: typeof emptyState) => unknown) => selector(emptyState),
    );

    const result = useWorkbenchLinkValues();
    const workspaceKeys = [
      'VNCDESKTOP',
      'VSCODE',
      'JUPYTERLAB',
      'JUPYTERNOTEBOOK',
    ];
    workspaceKeys.forEach((key) => {
      expect(result.find((el) => el.key === key)).toBeUndefined();
    });
    expect(result.find((el) => el.key === 'LIBRARY_PREVIEW')).toBeDefined();
    expect(result.find((el) => el.key === 'DT_PREVIEW')).toBeDefined();
  });

  it('cleanURL should remove leading and trailing slashes', () => {
    expect(cleanURL('/test/')).toBe('test');
    expect(cleanURL('/test')).toBe('test');
    expect(cleanURL('test/')).toBe('test');
    expect(cleanURL('test')).toBe('test');
  });

  it('still handles if basename is set to empty string', () => {
    globalThis.env.REACT_APP_URL_BASENAME = '';
    expect(useURLforDT()).toBe(`${testAppURL}/${testUsername}/${testDT}`);
    expect(useURLforLIB()).toBe(`${testAppURL}/${testUsername}/${testLIB}`);
    expect(useURLbasename()).toBe('');
  });
});
