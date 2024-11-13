import { Global, Module } from '@nestjs/common';
import Config from './config.service.js';
import * as nestConfig from '@nestjs/config';

@Global()
@Module({
  imports: [nestConfig.ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    {
      provide: Config,
      useFactory: async (envConfigservice: nestConfig.ConfigService) => {
        const confPath = envConfigservice.get<string>('LIBMS_CONFIG_PATH');
        const config = new Config();
        await config.loadConfig(confPath);
        return config;
      },
      inject: [nestConfig.ConfigService],
    },
  ],
  exports: [Config],
})
export class ConfigModule {}
