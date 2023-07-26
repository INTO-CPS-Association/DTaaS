import { ApolloDriver } from "@nestjs/apollo";
import { join } from "path";

export function getApolloDriverConfig() {
  return {
    driver: ApolloDriver,
    typePaths: join(process.cwd(), "src/schema.gql"),
    debug: false,
    playground: process.env.GRAPHQL_PLAYGROUND === "true",
    path: process.env.APOLLO_PATH,
  };
}
