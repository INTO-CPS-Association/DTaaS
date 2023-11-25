import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';

export default class SocketIOAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIOAdapter.name);

  constructor(private configService: ConfigService) {
    super();
  }

  createIOServer(port: number, options: ServerOptions) {
    const cors = {
      origin: [`http://localhost:${this.configService.get<number>('PORT')}`],
    };

    const optionsWithCors: ServerOptions = {
      ...options,
      cors,
      path: '/cmd/socket.io/',
    };

    this.logger.log(optionsWithCors);

    const server: Server = super.createIOServer(port, optionsWithCors);
    this.logger.log(`Socket.io server listening on port ${port}`);
    return server;
  }
}
