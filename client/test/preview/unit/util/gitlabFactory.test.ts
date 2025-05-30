/* eslint-disable import/first */
const GitlabMock = jest.fn();
jest.mock('@gitbeaker/rest', () => ({
  Gitlab: GitlabMock,
}));

import { BackendInterface } from 'model/backend/gitlab/interfaces';
import createGitlabInstance from 'preview/util/gitlabFactory';
import { mockAuthority } from 'test/__mocks__/global_mocks';

const TEST_TOKEN = 'testToken';
const TEST_PROJECT_NAME = 'testUser';

describe('createGitlabInstance', () => {
  const store: Record<string, string> = {};

  beforeAll(() => {
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        clear: () => {
          Object.keys(store).forEach((key) => {
            delete store[key];
          });
        },
      },
      writable: true,
    });
    GitlabMock.mockImplementation(
      (options: { host: string; token: string }) => ({
        host: options.host,
        token: options.token,
      }),
    );
  });

  afterEach(() => {});

  it('should create a GitlabInstance with the correct parameters', () => {
    sessionStorage.setItem('username', TEST_PROJECT_NAME);
    sessionStorage.setItem('access_token', TEST_TOKEN);
    const gitlabInstance: BackendInterface = createGitlabInstance();

    expect(gitlabInstance).toBeDefined();
    expect(gitlabInstance.projectName).toBe(TEST_PROJECT_NAME); // USED
    expect(GitlabMock).toHaveBeenCalledWith({
      host: mockAuthority,
      oauthToken: TEST_TOKEN,
    });
  });

  it('should not create a GitlabInstance without projectId in session storage', () => {
    sessionStorage.clear();
    expect(() => {
      createGitlabInstance();
    }).toThrow('Project name is not set in session storage.');
  });
});
