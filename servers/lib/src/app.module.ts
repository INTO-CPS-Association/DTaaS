import { ConfigModule } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import * as dotenv from "dotenv";
import FilesModule from "./files/files.module";
import getApolloDriverConfig from "../util";
import { LibmsCommand } from "./libms.command";

dotenv.config({ path: ".env" });

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot(getApolloDriverConfig()),
    FilesModule,
  ],
  providers: [LibmsCommand],
})
export default class AppModule {}
