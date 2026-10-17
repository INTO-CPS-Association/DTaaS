import { Injectable } from '@nestjs/common';
import ExecaManager from '../execa-manager.service.js';
import { executeCommandSchema, executeResponse } from '../dto/command.dto.js';
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
  // eslint-disable-next-line no-useless-constructor
  constructor(private readonly manager: ExecaManager) {} // eslint-disable-line no-empty-function

  async handle(route: MqttRoute, payload: Buffer): Promise<unknown> {
    if (route === 'execute') {
      return this.execute(payload);
    }
    if (route === 'status') {
      return this.manager.checkStatus();
    }
    return this.manager.checkHistory();
  }

  private async execute(payload: Buffer): Promise<unknown> {
    const command = executeCommandSchema.safeParse(parseJson(payload));
    if (!command.success) {
      return validationFailed().getResponse();
    }
    const [success] = await this.manager.newCommand(command.data.name);
    return executeResponse(success);
  }
}
