import { z } from 'zod';
import { dtNameSchema } from '../digital-twins/dto/digital-twin-name.dto.js';
import { executionIdSchema } from '../digital-twins/dto/execution-id.dto.js';
import { startExecutionOptionsSchema } from '../digital-twins/dto/start-execution.dto.js';
import {
  DigitalTwinError,
  type DigitalTwinErrorCode,
} from '../digital-twins/digital-twins.errors.js';
import type { IDigitalTwinsService } from '../digital-twins/interfaces/digital-twins.service.interface.js';
import type Topics from './topics.js';

export type ErrorCode =
  | 'bad-request'
  | 'unknown-operation'
  | 'not-found'
  | 'bad-gateway'
  | 'internal';

export type MqttResponse =
  | { correlationId: string | null; ok: true; data: unknown }
  | {
      correlationId: string | null;
      ok: false;
      error: { code: ErrorCode; message: string };
    };

export type HandledRequest = {
  response: MqttResponse;
  responseTopic: string | undefined;
  unexpected?: unknown;
};

const ERROR_CODES: Record<DigitalTwinErrorCode, ErrorCode> = {
  'digital-twin-not-found': 'not-found',
  'execution-not-found': 'not-found',
  'gitlab-failure': 'bad-gateway',
};

class RequestError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

const envelope = {
  correlationId: z.string().min(1),
  responseTopic: z.string().optional(),
};

const listRequestSchema = z.object(envelope).strict();

const digitalTwinRequestSchema = z
  .object({ ...envelope, dtName: dtNameSchema })
  .strict();

const startRequestSchema = z
  .object({
    ...envelope,
    dtName: dtNameSchema,
    ...startExecutionOptionsSchema.shape,
  })
  .strict();

const executionRequestSchema = z
  .object({ ...envelope, dtName: dtNameSchema, executionId: executionIdSchema })
  .strict();

function validate<Schema extends z.ZodType>(
  schema: Schema,
  json: unknown,
): z.infer<Schema> {
  const parsed = schema.safeParse(json);
  if (parsed.success) return parsed.data;
  const issues = parsed.error.issues.map(
    (issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`,
  );
  throw new RequestError('bad-request', issues.join('; '));
}

type Operation = (
  service: IDigitalTwinsService,
  json: unknown,
) => Promise<unknown>;

function operation<Schema extends z.ZodType>(
  schema: Schema,
  perform: (
    service: IDigitalTwinsService,
    request: z.infer<Schema>,
  ) => Promise<unknown>,
): Operation {
  return async (service, json) => perform(service, validate(schema, json));
}

const OPERATIONS = new Map<string, Operation>([
  [
    'list-digital-twins',
    operation(listRequestSchema, (service) => service.listDigitalTwins()),
  ],
  [
    'get-digital-twin',
    operation(digitalTwinRequestSchema, (service, request) =>
      service.getDigitalTwin(request.dtName),
    ),
  ],
  [
    'start-execution',
    operation(startRequestSchema, (service, request) =>
      service.startExecution(request.dtName, {
        runnerTag: request.runnerTag,
        branch: request.branch,
      }),
    ),
  ],
  [
    'stop-execution',
    operation(executionRequestSchema, (service, request) =>
      service.stopExecution(request.dtName, request.executionId),
    ),
  ],
  [
    'list-executions',
    operation(digitalTwinRequestSchema, (service, request) =>
      service.listExecutions(request.dtName),
    ),
  ],
  [
    'get-execution',
    operation(executionRequestSchema, (service, request) =>
      service.getExecution(request.dtName, request.executionId),
    ),
  ],
]);

function parseJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    throw new RequestError('bad-request', 'The payload is not JSON');
  }
}

function stringField(json: unknown, name: string): string | undefined {
  if (typeof json !== 'object' || json === null) return undefined;
  const value = (json as Record<string, unknown>)[name];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function responseTopicOf(json: unknown, topics: Topics): string | undefined {
  if (typeof json !== 'object' || json === null) return undefined;
  const requested = (json as Record<string, unknown>).responseTopic;
  if (requested === undefined) return undefined;
  if (typeof requested === 'string' && topics.isResponseTopic(requested)) {
    return requested;
  }
  throw new RequestError(
    'bad-request',
    `responseTopic: must be a topic name under ${topics.responseRoot()}`,
  );
}

function perform(
  service: IDigitalTwinsService,
  operationName: string,
  json: unknown,
): Promise<unknown> {
  const run = OPERATIONS.get(operationName);
  if (run === undefined) {
    throw new RequestError('unknown-operation', 'Unknown operation');
  }
  return run(service, json);
}

function codeOf(error: unknown): ErrorCode {
  if (error instanceof RequestError) return error.code;
  if (error instanceof DigitalTwinError) return ERROR_CODES[error.code];
  return 'internal';
}

function messageOf(error: unknown, code: ErrorCode): string {
  if (code === 'internal') return 'The request could not be handled';
  return error instanceof Error ? error.message : String(error);
}

export async function handleRequest(
  service: IDigitalTwinsService,
  topics: Topics,
  operationName: string,
  payload: string,
): Promise<HandledRequest> {
  let correlationId: string | null = null;
  let responseTopic: string | undefined;
  try {
    const json = parseJson(payload);
    // The correlation ID and the response topic are read before validation.
    // The response to an invalid request then carries the correlation ID and
    // goes to the topic that the request names.
    correlationId = stringField(json, 'correlationId') ?? null;
    responseTopic = responseTopicOf(json, topics);
    const data = await perform(service, operationName, json);
    return { response: { correlationId, ok: true, data }, responseTopic };
  } catch (error) {
    const code = codeOf(error);
    const message = messageOf(error, code);
    return {
      response: { correlationId, ok: false, error: { code, message } },
      responseTopic,
      ...(code === 'internal' ? { unexpected: error } : {}),
    };
  }
}
