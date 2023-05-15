import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

export const path = "user1";
export const files = [
  "README.md",
  "data",
  "digital twins",
  "functions",
  "models",
  "tools",
];
export const localFiles = ["file1.txt", "file2.txt", "file3.txt"];

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
