import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import FilesModule from './files/files.module.js';
import { ConfigModule } from './config/config.module.js';
import { CONFIG_SERVICE } from './config/config.interface.js';
import graphqlOptions from './graphql-options.js';

@Module({
  imports: [
    ConfigModule,
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      useFactory: graphqlOptions,
      inject: [CONFIG_SERVICE],
    }),
    FilesModule,
  ],
})
export default class AppModule {}
