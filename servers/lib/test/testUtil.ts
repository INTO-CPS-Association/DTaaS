import * as dotenv from "dotenv";
import { setTimeout } from "timers/promises";

dotenv.config({ path: ".env" });

// actual data for integration and e2e tests
export const readFileActualContent = ["content123"];

export const pathToTestDirectory = "user2";

export const testDirectory = {
  repository: {
    tree: {
      blobs: { edges: [] },
      trees: {
        edges: [
          { node: { name: "data", type: "tree" } },
          { node: { name: "digital twins", type: "tree" } },
          { node: { name: "functions", type: "tree" } },
          { node: { name: "models", type: "tree" } },
          { node: { name: "tools", type: "tree" } },
        ],
      },
    },
  },
};
export const testFileName = "README.md";
export const fstestFileContent = "content123";
export const pathToTestFileContent = "user2/tools/README.md";
export const testFileArray = [
  "data",
  "digital twins",
  "functions",
  "models",
  "tools",
];
export const testFileContent = {
  repository: {
    blobs: {
      nodes: [
        {
          name: "README.md",
          rawBlob: "content123",
          rawTextBlob: "content123",
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
  get(key: string): string {
    switch (key) {
      case "TOKEN":
        return process.env.TOKEN;
      case "LOCAL_PATH":
        return process.env.TEST_PATH;
      case "GITLAB_URL":
        return process.env.GITLAB_URL;
      case "GITLAB_GROUP":
        return "dtaas";
      case "MODE":
        if (process.env.MODE === "gitlab") {
          return "gitlab";
        }
        if (process.env.MODE === "local") {
          return "local";
        }
        return "unknown";

      default:
        return undefined;
    }
  }
}

export const mockReadFileResponseData = {
  project: {
    __typename: "Project",
    repository: {
      __typename: "Repository",
      blobs: {
        nodes: [
          {
            __typename: "Blob",
            name: "README.md",
            rawBlob: "content123",
            rawTextBlob: "content123",
          },
        ],
      },
    },
  },
};

export const expectedListDirectoryResponse = {
  data: {
    project: {
      repository: {
        tree: {
          blobs: {
            edges: [],
          },
          trees: {
            edges: [
              {
                node: {
                  type: "tree",
                  path: "data",
                  name: "data",
                },
              },
              {
                node: {
                  type: "tree",
                  path: "digital twins",
                  name: "digital twins",
                },
              },
              {
                node: {
                  type: "tree",
                  path: "functions",
                  name: "functions",
                },
              },
              {
                node: {
                  type: "tree",
                  path: "models",
                  name: "models",
                },
              },
              {
                node: {
                  type: "tree",
                  path: "tools",
                  name: "tools",
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
    project: {
      repository: {
        blobs: {
          nodes: [
            {
              name: "README.md",
              rawBlob: "content123",
              rawTextBlob: "content123",
            },
          ],
        },
      },
    },
  },
};

export const e2elistDirectory = `query listDirectory {
  project(fullPath: "dtaas/user2") {
	  repository {
      tree(recursive: false) {
        blobs {
          edges {
            node {
              name
              type
              path
            }
          }
        }
        trees {
          edges {
            node {
              type
              name
              path
            }
          }
        }
      }
    }
  }
}
`;

export const e2eReadFile = `query readFile {
  project(fullPath:"dtaas/user2")
  {
    repository {
      blobs(paths: ["tools/README.md"]) {
        nodes {
          name
          rawBlob
          rawTextBlob
        }
      }
    }
  }
}`;
