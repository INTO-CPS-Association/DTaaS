import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import * as cloudcmd from 'cloudcmd';

const runCloudCMD = (app: INestApplication, optionsPath: string) => {
  const filesPath = app.get(ConfigService).get<string>('LOCAL_PATH');

  const { createConfigManager } = cloudcmd;
  const configManager = createConfigManager({
    configPath: optionsPath,
  });

  configManager('root', filesPath);

  const server = app.getHttpServer();

  const socket = new Server(server, {
    path: `${configManager('prefix')}/socket.io`,
  });

  app.use(
    configManager('prefix'),
    cloudcmd({
      configManager,
      socket,
    }),
  );
};

export default runCloudCMD;
