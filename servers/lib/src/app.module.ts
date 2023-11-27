import { ConfigModule, ConfigService } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";
import { AppController } from "./controllers/app.controller";
import { AppService } from "./services/app.service";
import { ProjectResolver } from "./resolvers/project.resolver";
import { RepositoryResolver } from "./resolvers/repository.resolver";
import { TreeResolver } from "./resolvers/tree.resolver";
import { BlobResolver } from "./resolvers/blob.resolver";
import { EdgeResolver } from "./resolvers/edge.resolver";
import { NodeService } from "./services/node.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        typePaths: ["./**/*.gql"],
        definitions: {
          path: join(process.cwd(), "src/graphql.ts"),
        },
        playground: true,
        path: configService.get<string>("APOLLO_PATH"),
      }),
      inject: [ConfigService],
    }),
    // FilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ProjectResolver,
    RepositoryResolver,
    TreeResolver,
    BlobResolver,
    EdgeResolver,
    NodeService,
  ],
})
export default class AppModule {}
