import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
export const pathToTestDirectory = "user2";

export const e2eDirectory = [
  "Data",
  "Digital Twins",
  "Functions",
  "Models",
  "Tools",
];
export const testDirectory = [
  "Test-Data",
  "Test-Digital Twins",
  "Test-Functions",
  "Test-Models",
  "Test-Tools",
];


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
                  name: "Test-Data",
                },
                {
                  name: "Test-Digital Twins",
                },
                {
                  name: "Test-Functions",
                },
                {
                  name: "Test-Models",
                },
                {
                  name: "Test-Tools",
                },
              ],
            },
          },
        ],
      },
    },
  },
};

