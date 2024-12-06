import { Global, Module } from '@nestjs/common';
import * as nestConfig from '@nestjs/config';
import Config from './config.service.js';
import { CONFIG_SERVICE } from './config.interface.js';

@Global()
@Module({
  imports: [nestConfig.ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    {
      provide: CONFIG_SERVICE,
      useFactory: async (envConfigservice: nestConfig.ConfigService) => {
        const confPath = envConfigservice.get<string>('LIBMS_CONFIG_PATH');
        const config = new Config();
        await config.loadConfig(confPath);
        return config;
      },
      inject: [nestConfig.ConfigService],
    },
  ],
  exports: [CONFIG_SERVICE],
})
export class ConfigModule {}
