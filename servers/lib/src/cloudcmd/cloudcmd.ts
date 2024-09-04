import { INestApplication } from '@nestjs/common';
import { Server } from 'socket.io';
import * as cloudcmd from 'cloudcmd';
import { join, relative } from 'path';

const isWindowsAbsolutePath = (filesPath: string) => filesPath.includes(':');

const runCloudCMD = (
  app: INestApplication,
  optionsPath: string,
  filesPath: string,
) => {
  const { createConfigManager } = cloudcmd;
  const configManager = createConfigManager({
    configPath: join(process.cwd(), optionsPath),
  });

  if (isWindowsAbsolutePath(filesPath)) {
    const workDir = process.cwd();
    const relativePath = relative(workDir, filesPath);
    configManager('root', relativePath);
  } else {
    configManager('root', filesPath);
  }

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
