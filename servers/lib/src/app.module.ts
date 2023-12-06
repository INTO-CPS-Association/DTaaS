import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import FilesModule from './files/files.module';
import CloudCMDService from './cloudcmd/cloudcmd.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        path: configService.get<string>('APOLLO_PATH'),
      }),
      inject: [ConfigService],
    }),
    FilesModule,
  ],
  providers: [CloudCMDService],
})
export default class AppModule {}
