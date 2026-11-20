import { describe, expect, it, jest } from '@jest/globals';
import DescriptorService from 'src/descriptor.service';
import { CommandRefused, MAX_INPUT_BYTES } from 'src/dto/command.dto';
import ExecaManager from 'src/execa-manager.service';
import FsmService from 'src/fsm/fsm.service';
import { CommandResult } from 'src/interfaces/command.interface';
import { RunOptions } from 'src/interfaces/runner.interface';
import MqttRequestHandler from 'src/mqtt/mqtt-request.handler';
import { NO_RESOURCES } from 'src/resources/resources';
import { mqttRequest } from './mqtt.fixture';

const LOGS = new Map([
  ['stdout', 'hello world'],
  ['stderr', ''],
]);

const ENV = { DT_ID: 'hospital-1' };

const FIGURES = { cpuSeconds: 0.469, peakRssBytes: 115646464, processes: 2 };

const validationError = {
  message: 'Validation Failed',
  error: 'Bad Request',
  statusCode: 400,
};

// A handler whose manager ends each command as run does
function createHandler(run: () => Promise<CommandResult>) {
  const manager = {
    newCommand: jest.fn(
      (_name: string, _requestKey?: string, _options?: RunOptions) => run(),
    ),
  };
  const handler = new MqttRequestHandler(
    manager as unknown as ExecaManager,
    {
      environment: jest.fn((_command: string) => ENV),
    } as unknown as FsmService,
    {} as DescriptorService,
  );
  return { handler, manager };
}

const ending = (result: CommandResult) =>
  createHandler(() => Promise.resolve(result));

const json = (body: unknown) => Buffer.from(JSON.stringify(body));

describe('MQTT execute requests', () => {
  it('Should reply with the result of a successful command', async () => {
    const { handler, manager } = ending(['success', LOGS, 0, FIGURES]);

    const body = await handler.handle(
      'execute',
      mqttRequest(json({ name: 'create' })),
    );

    expect(manager.newCommand).toHaveBeenCalledWith('create', undefined, {
      env: ENV,
    });
    expect(body).toEqual({
      status: 'success',
      result: {
        exitCode: 0,
        stdout: 'hello world',
        stderr: '',
        resources: FIGURES,
      },
    });
  });

  it('Should pass the request key, the environment and the input on', async () => {
    const { handler, manager } = ending(['success', LOGS, 0, FIGURES]);
    const request = { name: 'admit', input: { ward: 'B' } };

    await handler.handle('execute', mqttRequest(json(request), 'key-1'));

    expect(manager.newCommand).toHaveBeenCalledWith('admit', 'key-1', {
      env: ENV,
      input: '{"ward":"B"}\n',
    });
  });

  it.each([
    ['failed', 3],
    ['stopped', null],
  ] as const)(
    'Should reply with the result of a %s command',
    async (outcome, exitCode) => {
      const { handler } = ending([outcome, new Map(), exitCode, NO_RESOURCES]);

      const body = await handler.handle(
        'execute',
        mqttRequest(json({ name: 'create' })),
      );

      expect(body).toEqual({
        status: outcome,
        result: {
          exitCode,
          stdout: '',
          stderr: '',
          resources: { cpuSeconds: null, peakRssBytes: null, processes: null },
        },
      });
    },
  );

  it.each(['invalid command', 'command running'] as const)(
    'Should reply %s for a refused request',
    async (status) => {
      const { handler } = createHandler(() =>
        Promise.reject(new CommandRefused(status)),
      );

      const body = await handler.handle(
        'execute',
        mqttRequest(json({ name: 'create' })),
      );

      expect(body).toEqual({ status });
    },
  );

  it.each([
    [
      'a request key that is too long',
      json({ name: 'create' }),
      'k'.repeat(256),
    ],
    ['a wrongly shaped request', json({ command: 'create' }), undefined],
    ['a request that is not JSON', Buffer.from('create'), undefined],
    ['an empty request', Buffer.alloc(0), undefined],
    ['an input that is a list', json({ name: 'create', input: [] }), undefined],
    [
      'an input that is too large',
      json({ name: 'create', input: { text: 'x'.repeat(MAX_INPUT_BYTES) } }),
      undefined,
    ],
  ])(
    'Should return the validation error for %s',
    async (_, payload, requestKey) => {
      const { handler, manager } = ending(['success', LOGS, 0, FIGURES]);

      const body = await handler.handle(
        'execute',
        mqttRequest(payload, requestKey),
      );

      expect(manager.newCommand).not.toHaveBeenCalled();
      expect(body).toEqual(validationError);
    },
  );
});
