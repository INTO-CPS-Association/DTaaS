import GitlabAPI from 'model/backend/gitlab/backend';
import { BackendInterface } from 'model/backend/gitlab/UtilityInterfaces';
import createGitlabInstance from 'model/backend/gitlab/gitlabFactory';
import * as envUtil from 'util/envUtil';

jest.mock('model/backend/gitlab/backend', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => jest.fn()),
}));

jest.mock('model/backend/gitlab/gitlabFactory', () => ({
  ...jest.requireActual('model/backend/gitlab/gitlabFactory'),
}));

const TEST_TOKEN = 'testToken';
const TEST_PROJECT_NAME = 'testUser';

describe('gitlabFactory', () => {
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
  });

  afterEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('should create a GitlabInstance with the correct parameters', () => {
    const getAuthoritySpy = jest.spyOn(envUtil, 'getAuthority');
    (getAuthoritySpy as jest.Mock).mockReturnValue(
      'https://mock-authority.com',
    );

    sessionStorage.setItem('username', TEST_PROJECT_NAME);
    sessionStorage.setItem('access_token', TEST_TOKEN);

    const gitlabInstance: BackendInterface = createGitlabInstance();

    expect(gitlabInstance).toBeDefined();
    expect(gitlabInstance.projectName).toBe(TEST_PROJECT_NAME);
    expect(getAuthoritySpy).toHaveBeenCalled();
    expect(GitlabAPI).toHaveBeenCalledWith(
      'https://mock-authority.com',
      TEST_TOKEN,
    );
  });

  it('should not create a GitlabInstance without projectId in session storage', () => {
    sessionStorage.clear();
    expect(() => {
      createGitlabInstance();
    }).toThrow('Project name is not set in session storage.');
  });
});
