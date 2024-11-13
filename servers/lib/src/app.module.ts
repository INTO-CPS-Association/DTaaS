import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import FilesModule from './files/files.module.js';
import Config from './config/config.service.js';
import { ConfigModule } from './config/config.module.js';

@Module({
  imports: [
    ConfigModule,
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      useFactory: (configService: Config) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        path: configService.getApolloPath(),
      }),
      inject: [Config],
    }),
    FilesModule,
  ],
})
export default class AppModule {}
