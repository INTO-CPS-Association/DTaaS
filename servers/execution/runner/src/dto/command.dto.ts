import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { hasOwnProto } from '../fsm/definition.js';
import type {
  CommandOptions,
  CommandResult,
} from '../interfaces/command.interface.js';
import { RunOutcome } from '../interfaces/runner.interface.js';
import type { ScriptResources } from '../resources/resources.js';

// The largest input, in bytes of its JSON
export const MAX_INPUT_BYTES = 64 * 1024;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The input as received: zod's record would copy it and drop an own
// __proto__ key, so such a key is refused, as in the state machine file
const inputSchema = z.custom<Record<string, unknown>>(
  (input) =>
    isPlainObject(input) &&
    !hasOwnProto(input) &&
    Buffer.byteLength(JSON.stringify(input)) <= MAX_INPUT_BYTES,
);

export const executeCommandSchema = z.object({
  name: z.string(),
  input: inputSchema.optional(),
});

export type ExecuteCommandDto = z.infer<typeof executeCommandSchema>;

// The environment of the script, its input, which it reads from stdin
// as one line of JSON, and the caller that submitted the command
export const runOptions = (
  { input }: ExecuteCommandDto,
  env: Record<string, string>,
  by?: string,
): CommandOptions => ({
  env,
  ...(input === undefined ? {} : { input: `${JSON.stringify(input)}\n` }),
  ...(by === undefined ? {} : { by }),
});

// The optional HTTP header, or MQTT 5 user property, with which a client
// marks a request, so that the runner can recognise a repeat of it
export const REQUEST_KEY = 'idempotency-key';

export const requestKeySchema = z.string().max(255).optional();

// Why a request ran no script
export type Refusal = 'invalid command' | 'command running';

export class CommandRefused extends Error {
  constructor(readonly status: Refusal) {
    super(status);
  }
}

// The outcome of a command request, and its HTTP status; MQTT has no
// status codes, so the body names the outcome
export const EXECUTE_STATUS_CODES: Record<RunOutcome | Refusal, HttpStatus> = {
  success: HttpStatus.OK,
  failed: HttpStatus.OK,
  stopped: HttpStatus.OK,
  'invalid command': HttpStatus.BAD_REQUEST,
  'command running': HttpStatus.CONFLICT,
};

export type CommandResultDto = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  resources: ScriptResources;
};

export type ExecuteResponseDto =
  { status: RunOutcome; result: CommandResultDto } | { status: Refusal };

const resultDto = ([
  ,
  logs,
  exitCode,
  resources,
]: CommandResult): CommandResultDto => ({
  exitCode,
  stdout: logs.get('stdout') ?? '',
  stderr: logs.get('stderr') ?? '',
  resources,
});

// The reply to a command request; a refused one has no result, and any
// other error is left to the caller
export async function executeReply(
  run: Promise<CommandResult>,
): Promise<ExecuteResponseDto> {
  try {
    const result = await run;
    return { status: result[0], result: resultDto(result) };
  } catch (error) {
    if (error instanceof CommandRefused) {
      return { status: error.status };
    }
    throw error;
  }
}

// Without a name, or without a body, every run in progress stops
export const stopSchema = z.object({ name: z.string().optional() }).default({});

export type StopDto = z.infer<typeof stopSchema>;

export type StopResponseDto = { stopped: string[] };
