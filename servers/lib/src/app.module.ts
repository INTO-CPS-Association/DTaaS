import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import FilesModule from './files/files.module.js';
import { ConfigModule } from './config/config.module.js';
import { CONFIG_SERVICE, IConfig } from './config/config.interface.js';

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
})
export default class AppModule {}
