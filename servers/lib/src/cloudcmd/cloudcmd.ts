import { INestApplication } from '@nestjs/common';
import { Server } from 'socket.io';
import * as cloudcmd from 'cloudcmd';
import { join } from 'path';

const runCloudCMD = (
  app: INestApplication,
  optionsPath: string,
  filesPath: string,
) => {
  const { createConfigManager } = cloudcmd;
  const configManager = createConfigManager({
    configPath: join(process.cwd(), optionsPath),
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
