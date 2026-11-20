import { describe, expect, it, jest } from '@jest/globals';
import DescriptorService from 'src/descriptor.service';
import ExecaManager from 'src/execa-manager.service';
import FsmService from 'src/fsm/fsm.service';
import MqttRequestHandler from 'src/mqtt/mqtt-request.handler';
import { mqttRequest } from './mqtt.fixture';

const document = {
  scope: {
    value: 'single',
    type: 'enum',
    values: ['single', 'multi'],
    default: 'single',
    controllable: true,
  },
};

// A handler whose state machine has the parameters of the document, or
// no state machine
function createHandler(machine = true) {
  const parameters = { document: jest.fn(() => document) };
  const fsm = {
    parameters: jest.fn(() => (machine ? parameters : undefined)),
    setParameters: jest.fn((_body: object): string[] => []),
  };
  const handler = new MqttRequestHandler(
    {} as ExecaManager,
    fsm as unknown as FsmService,
    {} as DescriptorService,
  );
  return { handler, fsm };
}

const json = (body: unknown) => Buffer.from(JSON.stringify(body));

const noMachine = { status: 'no state machine', state: null };

describe('MQTT request handler parameters', () => {
  it('Should return the parameters', async () => {
    const { handler } = createHandler();

    expect(
      await handler.handle('parameters', mqttRequest(Buffer.alloc(0))),
    ).toEqual(document);
  });

  it('Should set the parameters and return them', async () => {
    const { handler, fsm } = createHandler();

    const body = await handler.handle(
      'set-parameters',
      mqttRequest(json({ scope: 'multi' })),
    );

    expect(fsm.setParameters).toHaveBeenCalledWith({ scope: 'multi' });
    expect(body).toEqual(document);
  });

  it('Should return the HTTP 400 body with the problems of a body', async () => {
    const { handler, fsm } = createHandler();
    const problems = ['parameter size is not declared'];
    fsm.setParameters.mockReturnValueOnce(problems);

    expect(
      await handler.handle('set-parameters', mqttRequest(json({ size: 1 }))),
    ).toEqual({
      message: problems,
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it.each([
    ['a value that is an object', json({ scope: { name: 'multi' } })],
    ['a body that is not an object', json(['multi'])],
  ])('Should return the validation error for %s', async (_, payload) => {
    const { handler, fsm } = createHandler();

    expect(
      await handler.handle('set-parameters', mqttRequest(payload)),
    ).toEqual({
      message: 'Validation Failed',
      error: 'Bad Request',
      statusCode: 400,
    });
    expect(fsm.setParameters).not.toHaveBeenCalled();
  });

  it.each(['parameters', 'set-parameters'] as const)(
    'Should answer %s that there is no state machine',
    async (route) => {
      const { handler } = createHandler(false);

      expect(await handler.handle(route, mqttRequest(json({})))).toEqual(
        noMachine,
      );
    },
  );
});
