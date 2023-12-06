import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost } from "@nestjs/core";
import { Server } from "socket.io";
import * as cloudcmd from "cloudcmd";
import * as cloudCMDOptions from "../../config/cloudcmd.json";

@Injectable()
export default class CloudCMDService {
  private readonly logger = new Logger(CloudCMDService.name);

  private socket: Server;

  constructor(
    private configService: ConfigService,
    private adapterHost: HttpAdapterHost,
  ) {
    const filesPath = this.configService.get<string>("LOCAL_PATH");

    let root: string;
    try {
      if (cloudCMDOptions.root === "") {
        throw new Error("");
      }
      root = cloudCMDOptions.root;
    } catch {
      root = filesPath;
    }

    const server = this.adapterHost.httpAdapter;

    this.logger.log(server, filesPath);
    this.socket = new Server(server.getHttpServer(), {
      path: "/fileserver/socket.io/",
    });

    server.use(
      "/fileserver",
      cloudcmd({ config: { ...cloudCMDOptions, root }, socket: this.socket }),
    );

    this.logger.log(
      `Middleware initialized for route: ${cloudCMDOptions.prefix}`,
    );
  }
}
