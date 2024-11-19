import * as dotenv from 'dotenv';
import { IConfig } from 'src/config/config.interface';
import { setTimeout } from 'timers/promises';
import { jest } from '@jest/globals';
import { GitRepo } from 'src/config/config.model';
import { CONFIG_MODE } from 'src/enums/config-mode.enum';

dotenv.config({ path: '.env' });

// actual data for integration and e2e tests
export const readFileActualContent = ['content123'];

export const pathToTestDirectory = 'user2';

export const testDirectory = {
  repository: {
    tree: {
      blobs: { edges: [] },
      trees: {
        edges: [
          { node: { name: 'data', type: 'tree' } },
          { node: { name: 'digital_twins', type: 'tree' } },
          { node: { name: 'functions', type: 'tree' } },
          { node: { name: 'models', type: 'tree' } },
          { node: { name: 'tools', type: 'tree' } },
        ],
      },
    },
  },
};
export const testFileName = 'README.md';
export const fstestFileContent = 'content123';
export const pathToTestFileContent = 'user2/tools/README.md';
export const testFileArray = [
  'data',
  'digital_twins',
  'functions',
  'models',
  'tools',
];
export const testFileContent = {
  repository: {
    blobs: {
      nodes: [
        {
          name: 'README.md',
          rawBlob: 'content123',
          rawTextBlob: 'content123',
        },
      ],
    },
  },
};

export function sleep(ms) {
  const timer = setTimeout(ms);
  Promise.resolve(timer);
}

export class MockConfigService {
  // eslint-disable-next-line class-methods-use-this

  getMode(): string {
    return '';
  }

  getLocalPath(): string {
    return 'test/data';
  }
}

export const jestMockConfigService = (): IConfig => ({
  getMode: jest.fn<() => string>().mockReturnValue(CONFIG_MODE.LOCAL),
  getLocalPath: jest.fn<() => string>().mockReturnValue('test/data'),
  getApolloPath: jest.fn<() => string>(),
  getGitRepos: jest.fn<() => { [key: string]: GitRepo }[]>(),
  getGraphqlPlayground: jest.fn<() => string>(),
  getLogLevel: jest.fn<() => string>(),
  getPort: jest.fn<() => number>(),
  loadConfig: jest.fn<() => Promise<void>>(),
});

export const mockReadFileResponseData = {
  project: {
    __typename: 'Project',
    repository: {
      __typename: 'Repository',
      blobs: {
        nodes: [
          {
            __typename: 'Blob',
            name: 'README.md',
            rawBlob: 'content123',
            rawTextBlob: 'content123',
          },
        ],
      },
    },
  },
};

export const expectedListDirectoryResponse = {
  data: {
    listDirectory: {
      repository: {
        tree: {
          trees: {
            edges: [
              {
                node: {
                  name: 'data',
                },
              },
              {
                node: {
                  name: 'digital_twins',
                },
              },
              {
                node: {
                  name: 'functions',
                },
              },
              {
                node: {
                  name: 'models',
                },
              },
              {
                node: {
                  name: 'tools',
                },
              },
            ],
          },
        },
      },
    },
  },
};

export const expectedFileContentResponse = {
  data: {
    readFile: {
      repository: {
        blobs: {
          nodes: [
            {
              name: 'README.md',
              rawBlob: 'content123',
              rawTextBlob: 'content123',
            },
          ],
        },
      },
    },
  },
};

export const e2elistDirectory = `query {
  listDirectory(path:"user2")
  {
    repository{
      tree{
        trees{
          edges{
            node{
              name
              
            }
          }
        }
      }
    }
  }
}`;

export const e2eReadFile = `query {
  readFile(path:"user2/tools/README.md") {
    repository {
      blobs {
        nodes {
          name
          rawBlob
          rawTextBlob
        }
      }
    }
  }
}`;
