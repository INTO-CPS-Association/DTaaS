import { join } from "path";
import * as dotenv from "dotenv";
import { ApolloDriver } from "@nestjs/apollo";

dotenv.config({ path: ".env" });

export const path = "user1";
export const files = ["digital twins", "functions", "data", "tools", "models"];
export const localFiles = ["file1", "file2", "file3"];

export function createGraphQLTestModule() {
  return {
    driver: ApolloDriver,
    autoSchemaFile: join(process.cwd(), "src/schema.gql"),
    debug: false,
    playground: process.env.GRAPHQL_PLAYGROUND === "true",
    path: process.env.APOLLO_PATH,
  };
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
