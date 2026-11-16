import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { REQUEST_KEY } from '../dto/command.dto.js';
import { validRequestKey } from '../validation.pipe.js';
import type { CallerRequest } from './access.guard.js';

// The checked request key of an HTTP request, and the name of the
// principal that the access guard verified, if any
export type CallerInfo = { requestKey?: string; by?: string };

export const callerInfo = (request: CallerRequest): CallerInfo => ({
  requestKey: validRequestKey(request.headers[REQUEST_KEY] as string),
  by: request.principal?.name,
});

export const Caller = createParamDecorator(
  (_: unknown, context: ExecutionContext): CallerInfo =>
    callerInfo(context.switchToHttp().getRequest()),
);
