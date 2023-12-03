import { ConfigService } from "@nestjs/config";
import { INestApplication } from "@nestjs/common";
import { Server } from "socket.io";
import cloudcmd = require("cloudcmd");
import createConfig from "./cloudcmd.config";

const runCloudCmd = (app: INestApplication) => {
  const configService = app.get(ConfigService);
  const fileServerPath = configService.get<string>("FILE_SERVER_PATH");

  const server = app.getHttpServer();

  const socket = new Server(server, {
    path: `${fileServerPath}/socket.io/`,
  });

  app.use(
    fileServerPath,
    cloudcmd({
      config: createConfig(),
      socket,
    }),
  );
};
export default runCloudCmd;
