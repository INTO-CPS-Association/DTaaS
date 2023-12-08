import { INestApplication, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Server } from "socket.io";
import * as cloudcmd from "cloudcmd";

@Injectable()
export default class CloudCMDService {
  private readonly logger = new Logger(CloudCMDService.name);

  private socket: Server;

  // eslint-disable-next-line
  constructor(private configService: ConfigService) {}

  run(app: INestApplication, optionsPath: string) {
    const filesPath = this.configService.get<string>("LOCAL_PATH");

    const { createConfigManager } = cloudcmd;
    const configManager = createConfigManager({
      configPath: optionsPath,
    });

    configManager("root", filesPath);

    const server = app.getHttpServer();

    this.socket = new Server(server, {
      path: `${configManager("prefix")}/socket.io`,
    });

    app.use(
      configManager("prefix"),
      cloudcmd({
        configManager,
        socket: this.socket,
      }),
    );

    this.logger.log(`Listening on route: ${configManager("prefix")}`);
  }
}
