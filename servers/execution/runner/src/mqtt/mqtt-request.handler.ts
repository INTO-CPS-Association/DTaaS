import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { z } from 'zod';
import { MESSAGES } from '@nestjs/core/constants.js';
import { authorize, listedCommand } from '../auth/roles.js';
import DescriptorService from '../descriptor.service.js';
import ExecaManager from '../execa-manager.service.js';
import {
  executeCommandSchema,
  executeReply,
  requestKeySchema,
  runOptions,
  stopSchema,
} from '../dto/command.dto.js';
import { escalateSchema } from '../dto/escalation.dto.js';
import { eventSchema, fsmReply, transitionSchema } from '../dto/fsm.dto.js';
import { healthReport } from '../dto/health.dto.js';
import { historyQuerySchema } from '../dto/history.dto.js';
import { ParametersBody, parametersBodySchema } from '../dto/parameters.dto.js';
import { PeersBody, peersBodySchema } from '../dto/peers.dto.js';
import FsmService from '../fsm/fsm.service.js';
import { validationFailed } from '../validation.pipe.js';
import { MqttRoute } from './mqtt.config.js';
import { MqttRequest } from './mqtt-request.js';

// Answers an MQTT request with the JSON body that the matching
// HTTP route returns, so that both protocols share one API.
@Injectable()
export default class MqttRequestHandler {
  private readonly logger = new Logger(MqttRequestHandler.name);

  constructor(
    private readonly manager: ExecaManager,
    private readonly fsm: FsmService,
    private readonly descriptor: DescriptorService,
  ) {}

  private readonly routes: Record<
    MqttRoute,
    (request: MqttRequest) => unknown
  > = {
    execute: this.whenValid(executeCommandSchema, (command, request) =>
      executeReply(
        this.manager.newCommand(
          command.name,
          request.requestKey,
          runOptions(
            command,
            this.fsm.environment(command.name),
            request.principal?.name,
          ),
        ),
      ),
    ),
    stop: this.whenValid(stopSchema, async ({ name }) => ({
      stopped: await this.manager.stop(name),
    })),
    status: () => this.manager.checkStatus(),
    history: this.whenValid(historyQuerySchema, (query) =>
      this.manager.checkHistory(query),
    ),
    transition: this.whenValid(transitionSchema, ({ state }, request) =>
      this.fsm.transition(state, request.requestKey),
    ),
    event: this.whenValid(eventSchema, ({ event }, request) =>
      this.fsm.event(event, request.requestKey),
    ),
    fsm: () => this.fsm.check() ?? fsmReply('no state machine', undefined),
    dt: () => this.descriptor.describe(),
    state: () => this.descriptor.state(),
    metrics: () => this.descriptor.metrics(),
    // a request arrives only over a connected client
    health: () =>
      healthReport(
        'connected',
        this.manager.databaseMode(),
        this.manager.scriptsHealth(),
      ),
    parameters: () => this.parameterDocument(),
    'set-parameters': this.whenValid(parametersBodySchema, (body) =>
      this.setParameters(body),
    ),
    escalate: this.whenValid(escalateSchema, (body, request) =>
      this.fsm.escalate(body, request.requestKey),
    ),
    peers: () => this.descriptor.peers().document(),
    'set-peers': this.whenValid(peersBodySchema, (body) => this.setPeers(body)),
  };

  // The role comes before the body, as Nest runs guards before pipes. A
  // refusal gets the body of its HTTP reply, and an unexpected error the
  // body of an HTTP 500 response.
  async handle(route: MqttRoute, request: MqttRequest): Promise<unknown> {
    try {
      this.authorize(route, request);
      return await this.routes[route](request);
    } catch (error) {
      return this.failure(route, error);
    }
  }

  // Only a request with a credential has a principal
  private authorize(route: MqttRoute, { principal, body }: MqttRequest) {
    if (principal !== undefined) {
      const commands = this.fsm.declared()?.managerCommands ?? [];
      const listed = listedCommand(commands, body);
      authorize(principal, route, listed);
      this.logger.debug(`${principal.name} calls ${route}`);
    }
  }

  private failure(route: MqttRoute, error: unknown): unknown {
    if (error instanceof HttpException) {
      return error.getResponse();
    }
    this.logger.error(`MQTT ${route} request failed: ${error}`);
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
    };
  }

  // A route that answers a request whose body or request key is invalid
  // with the validation error of the HTTP API
  private whenValid<T>(
    schema: z.ZodType<T>,
    handle: (body: T, request: MqttRequest) => unknown,
  ): (request: MqttRequest) => unknown {
    return (request) => {
      const body = schema.safeParse(request.body);
      const key = requestKeySchema.safeParse(request.requestKey);
      if (!body.success || !key.success) {
        return validationFailed().getResponse();
      }
      return handle(body.data, request);
    };
  }

  private parameterDocument(): unknown {
    return (
      this.fsm.parameters()?.document() ??
      fsmReply('no state machine', undefined)
    );
  }

  // A refused body gets the body of the HTTP 400 reply
  private setParameters(body: ParametersBody): unknown {
    const problems = this.fsm.setParameters(body);
    return problems.length > 0
      ? new BadRequestException(problems).getResponse()
      : this.parameterDocument();
  }

  private setPeers(body: PeersBody): unknown {
    const problems = this.descriptor.peers().set(body);
    return problems.length > 0
      ? new BadRequestException(problems).getResponse()
      : this.descriptor.peers().document();
  }
}
