import { ConfigModule, ConfigService } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";
import { ProjectResolver } from "./resolvers/project.resolver";
import { RepositoryResolver } from "./resolvers/repository.resolver";
import { TreeResolver } from "./resolvers/tree.resolver";
import { BlobResolver } from "./resolvers/blob.resolver";
import { EdgeResolver } from "./resolvers/edge.resolver";
import { ProjectService } from "./services/project.service";
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
  providers: [
    ProjectResolver,
    ProjectService,
    NodeService,
    RepositoryResolver,
    TreeResolver,
    BlobResolver,
    EdgeResolver,
  ],
})
export default class AppModule {}
