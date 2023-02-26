import { Module } from '@nestjs/common';
import { FilesService } from './files/files.service';
import { FilesResolver } from './files/files.resolver';
import { join } from 'path';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      debug: false,
      playground: true,
    }),
    FilesModule,
  ],
  controllers:[],
  providers: [FilesService, FilesResolver],
})
export class AppModule {}
