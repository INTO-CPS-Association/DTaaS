import { Logger, Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost } from "@nestjs/core";
// import { Server } from "socket.io";
import * as cloudcmd from "cloudcmd";
import * as cloudCMDOptions from "../../config/cloudcmd.json";

@Injectable()
export default class CloudCMDMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CloudCMDMiddleware.name);

  // private socket: Server;

  constructor(
    private configService: ConfigService,
    private adapterHost: HttpAdapterHost,
  ) {
    const filesPath = this.configService.get<string>("LOCAL_PATH");

    if (!("root" in cloudCMDOptions)) {
      cloudCMDOptions.root = filesPath;
    }
    // cloudCMDOptions.prefixSocket
    const server = this.adapterHost.httpAdapter.getHttpServer();

    this.logger.log(server);
    // this.socket = new Server(server, {
    //   path: "/fileserver/socket.io/",
    // });

    this.logger.log(
      `Middleware initialized for route: ${cloudCMDOptions.prefix} ${cloudCMDOptions.root}`,
    );
  }

  // eslint-disable-next-line
  use = cloudcmd();
}
