import { INestApplication, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Server } from "socket.io";
import * as cloudcmd from "cloudcmd";
import * as fs from "fs";

@Injectable()
export default class CloudCMDService {
  private readonly logger = new Logger(CloudCMDService.name);

  private socket: Server;

  // eslint-disable-next-line
  constructor(private configService: ConfigService) {}

  run(app: INestApplication, optionsPath: string) {
    const filesPath = this.configService.get<string>("LOCAL_PATH");
    const rawData = fs.readFileSync(optionsPath, "utf8");
    const options = JSON.parse(rawData);

    if (!options.prefix && options.prefix !== "") {
      throw new Error("Missing required options prefix for cloudcmd to run");
    }

    if (!options.root && options.root !== "") {
      options.root = filesPath;
    }

    this.logger.log(options);

    const server = app.getHttpServer();

    this.socket = new Server(server, {
      path: `${options.prefix}`,
    });

    app.use(options.prefix, cloudcmd({ config: options, socket: this.socket }));

    this.logger.log(`Listening on route: ${options.prefix}`);
  }
}
