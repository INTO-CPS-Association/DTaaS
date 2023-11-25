import { Logger } from '@nestjs/common';
import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway({
  namespace: 'event',
})
export default class EventsGateway implements OnGatewayInit {
  private readonly logger = new Logger(EventsGateway.name);

  constructor() {}

  afterInit(): void {
    this.logger.log('Websocket Gateway initialized');
  }
}
