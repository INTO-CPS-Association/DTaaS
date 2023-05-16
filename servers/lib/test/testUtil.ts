import * as dotenv from "dotenv";
import { gql } from "@apollo/client/core";
dotenv.config({ path: ".env" });

// actual data for integration and e2e tests
export const pathToDirectory = "user1";
export const directory = [
  "README.md",
  "data",
  "digital twins",
  "functions",
  "models",
  "tools",
];

export const pathToFileContent = "common/functions/function1/function1.txt";
export const fileContent = "content123";

// mocked data for unit tests
export const pathToTestDirectory = "test_user1";
export const testDirectory = ["testfile.txt", "testfolder"];
export const pathToTestFileContent = "test_user1/testfile.txt";
export const testFileContent = "testcontent123";

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

export const TEST_LIST_DIRECTORY = gql`
  query listDirectory($path: String, $domain: ID!) {
    project(fullPath: $domain) {
      repository {
        tree(path: $path, recursive: false) {
          blobs {
            edges {
              node {
                name
                type
              }
            }
          }
          trees {
            edges {
              node {
                name
                type
              }
            }
          }
        }
      }
    }
  }
`;
