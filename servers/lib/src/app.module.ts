import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import FilesModule from './files/files.module.js';
import { ConfigModule } from './config/config.module.js';
import { CONFIG_SERVICE, IConfig } from './config/config.interface.js';
import { ConsoleLogger } from './util/logger.js'; //2025-03-03: added with the intent of following
//                                                              the NestJS style integration test

@Module({
  imports: [
    ConfigModule,
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      useFactory: (configService: IConfig) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        path: configService.getApolloPath(),
      }),
      inject: [CONFIG_SERVICE],
    }),
    FilesModule,
  ],
  providers: [ConsoleLogger], //2025-03-03: to supposed implement the custom logger
})
export default class AppModule { }
