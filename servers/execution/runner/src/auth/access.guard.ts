import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import Config from '../config/configuration.service.js';
import FsmService from '../fsm/fsm.service.js';
import { MqttRoute } from '../mqtt/mqtt.config.js';
import Access from './access.js';
import { Principal } from './auth.config.js';
import {
  ACCESS_ROUTE,
  authorize,
  listedCommand,
  ROUTE_ROLES,
} from './roles.js';

// The request as the guard leaves it: rawBody is Nest's with rawBody on
export type CallerRequest = Request & {
  rawBody?: Buffer;
  principal?: Principal;
};

// Checks the credential and the role of every HTTP request, as an
// APP_GUARD, so that no new controller is missed; Nest runs it after
// the body parser (413) and before the pipes (400)
@Injectable()
export default class AccessGuard implements CanActivate {
  private readonly logger = new Logger(AccessGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly config: Config,
    private readonly fsm: FsmService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const access = this.config.access();
    if (access === undefined) {
      return true;
    }
    const route = this.reflector.get<MqttRoute | undefined>(
      ACCESS_ROUTE,
      context.getHandler(),
    );
    if (route === undefined) {
      throw new ForbiddenException();
    }
    if (ROUTE_ROLES[route] !== 'public') {
      this.check(access, route, context.switchToHttp().getRequest());
    }
    return true;
  }

  // Leaves the principal on the request for the handler
  private check(access: Access, route: MqttRoute, request: CallerRequest) {
    const { method, path, rawBody, headers } = request;
    const call = { method, path, body: rawBody };
    const principal = access.http(headers.authorization, call);
    const commands = this.fsm.declared()?.managerCommands ?? [];
    const listed = listedCommand(commands, request.body);
    authorize(principal, route, listed);
    request.principal = principal;
    this.logger.debug(`${principal.name} calls ${route}`);
  }
}
