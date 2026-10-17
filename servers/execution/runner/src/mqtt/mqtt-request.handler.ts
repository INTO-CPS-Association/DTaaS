import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { MESSAGES } from '@nestjs/core/constants.js';
import ExecaManager from '../execa-manager.service.js';
import {
  executeCommandSchema,
  executeResponse,
  requestKeySchema,
} from '../dto/command.dto.js';
import { validationFailed } from '../validation.pipe.js';
import { MqttRoute } from './mqtt.config.js';

function parseJson(payload: Buffer): unknown {
  try {
    return JSON.parse(payload.toString());
  } catch {
    return undefined;
  }
}

// Answers an MQTT request with the JSON body that the matching
// HTTP route returns, so that both protocols share one API.
@Injectable()
export default class MqttRequestHandler {
  private readonly logger = new Logger(MqttRequestHandler.name);

  // eslint-disable-next-line no-useless-constructor
  constructor(private readonly manager: ExecaManager) {} // eslint-disable-line no-empty-function

  private readonly routes: Record<
    MqttRoute,
    (payload: Buffer, requestKey?: string) => Promise<unknown> | unknown
  > = {
    execute: (payload, requestKey) => this.execute(payload, requestKey),
    status: () => this.manager.checkStatus(),
    history: () => this.manager.checkHistory(),
  };

  // An unexpected error gets the same body as an HTTP 500 response
  async handle(
    route: MqttRoute,
    payload: Buffer,
    requestKey?: string,
  ): Promise<unknown> {
    try {
      return await this.routes[route](payload, requestKey);
    } catch (error) {
      this.logger.error(`MQTT ${route} request failed: ${error}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
      };
    }
  }

  private async execute(
    payload: Buffer,
    requestKey?: string,
  ): Promise<unknown> {
    const command = executeCommandSchema.safeParse(parseJson(payload));
    if (!command.success || !requestKeySchema.safeParse(requestKey).success) {
      return validationFailed().getResponse();
    }
    const [success] = await this.manager.newCommand(
      command.data.name,
      requestKey,
    );
    return executeResponse(success);
  }
}
