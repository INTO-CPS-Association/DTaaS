import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
export const pathToTestDirectory = "user2";

export const e2eDirectory = [
  "data",
  "digital twins",
  "functions",
  "models",
  "tools",
];
export const testDirectory = [
  "data",
  "digital twins",
  "functions",
  "models",
  "tools",
];

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export class MockConfigService {
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
        } else if (process.env.MODE === "local") {
          return "local";
        } else {
          return "unknown";
        }
      default:
        return undefined;
    }
  }
}

export const mockQueryResponseData = {
  project: {
    repository: {
      paginatedTree: {
        nodes: [
          {
            trees: {
              nodes: [
                {
                  name: "data",
                },
                {
                  name: "digital twins",
                },
                {
                  name: "functions",
                },
                {
                  name: "models",
                },
                {
                  name: "tools",
                },
              ],
            },
          },
        ],
      },
    },
  },
};
