import * as dotenv from "dotenv";
import { gql } from "@apollo/client/core";
dotenv.config({ path: ".env" });

// actual data for integration and e2e tests
export const pathToRealFileContent = "user2/user2-readme.md";
export const pathToRealDirectory = "user2";
export const readFileActualContent = "actual content of user2 - locally";
export const pathToTestDirectory = "user2";
export const testDirectory = [
  "Test-README.md",
  "Test-Data",
  "Test-Digital Twins",
  "Test-Functions",
  "Test-Models",
  "Test-Tools",
];

export const pathToTestFileContent = "user2/Test-README.md";
export const testFileContent = ["testcontent123"];

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

export const mockListDirectoryResponseData = {
  project: {
    __typename: "Project",
    repository: {
      __typename: "Repository",
      tree: {
        blobs: {
          edges: [{ node: { name: "Test-README.md", type: "blob" } }],
        },
        trees: {
          edges: [
            { node: { name: "Test-Data", type: "tree" } },
            { node: { name: "Test-Digital Twins", type: "tree" } },
            { node: { name: "Test-Functions", type: "tree" } },
            { node: { name: "Test-Models", type: "tree" } },
            { node: { name: "Test-Tools", type: "tree" } },
          ],
        },
      },
    },
  },
};

export const mockReadFileResponseData = {
  project: {
    __typename: "Project",
    repository: {
      __typename: "Repository",
      blobs: {
        nodes: [
          {
            __typename: "Blob",
            name: "Test-README.md",
            rawBlob: "testcontent123",
            rawTextBlob: "testcontent123",
          },
        ],
      },
    },
  },
};
