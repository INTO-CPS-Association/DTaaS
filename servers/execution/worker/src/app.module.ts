import { ConfigModule } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { FilesModule } from "./files/files.module";
import * as dotenv from "dotenv";
import { getApolloDriverConfig } from "../util";
dotenv.config({ path: ".env" });

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot(getApolloDriverConfig()),
    FilesModule,
  ],
  providers: [],
})
export class AppModule {}
