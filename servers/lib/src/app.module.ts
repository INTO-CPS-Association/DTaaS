import { ConfigModule } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { join } from "path";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { FilesModule } from "./files/files.module";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/schema.gql"),
      debug: false,
      playground: process.env.GRAPHQL_PLAYGROUND === "true",
      path: process.env.APOLLO_PATH,
    }),
    FilesModule,
  ],
  providers: [],
})
export class AppModule {}
