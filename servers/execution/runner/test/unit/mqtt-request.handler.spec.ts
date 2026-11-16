import { describe, expect, it, jest } from '@jest/globals';
import DescriptorService from 'src/descriptor.service';
import ExecaManager from 'src/execa-manager.service';
import FsmService from 'src/fsm/fsm.service';
import { RunOutcome } from 'src/interfaces/runner.interface';
import MqttRequestHandler from 'src/mqtt/mqtt-request.handler';
import {
  dt,
  fakeDescriptor,
  fakeManager,
  historyEntry,
  metricsDocument,
  stateDocument,
  status,
  mqttRequest,
} from './mqtt.fixture';

function createHandler(outcome: RunOutcome) {
  const manager = fakeManager(outcome);
  const accepted = { status: 'accepted', state: 'create' };
  const fsm = {
    transition: jest.fn((_state: string, _requestKey?: string) => accepted),
    event: jest.fn((_event: string, _requestKey?: string) => accepted),
    check: jest.fn((): unknown => undefined),
    environment: jest.fn((_command: string) => env),
  };
  const descriptor = fakeDescriptor();
  const handler = new MqttRequestHandler(
    manager as unknown as ExecaManager,
    fsm as unknown as FsmService,
    descriptor as unknown as DescriptorService,
  );
  return { handler, manager, fsm };
}

const env = { DT_ID: 'hospital-1' };

const json = (body: unknown) => Buffer.from(JSON.stringify(body));

describe('MQTT request handler', () => {
  it.each([
    ['an empty payload', Buffer.alloc(0), undefined],
    ['an empty object', json({}), undefined],
    ['a name', json({ name: 'create' }), 'create'],
  ])('Should stop the runs for %s', async (_, payload, name) => {
    const { handler, manager } = createHandler('success');

    const body = await handler.handle('stop', mqttRequest(payload));

    expect(manager.stop).toHaveBeenCalledWith(name);
    expect(body).toEqual({ stopped: ['create'] });
  });

  it.each([
    ['a payload that is not JSON', Buffer.from('create')],
    ['a name that is not a string', json({ name: 1 })],
  ])('Should refuse to stop for %s', async (_, payload) => {
    const { handler, manager } = createHandler('success');

    const body = await handler.handle('stop', mqttRequest(payload));

    expect(manager.stop).not.toHaveBeenCalled();
    expect(body).toEqual({
      message: 'Validation Failed',
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('Should return the status of the last command', async () => {
    const { handler } = createHandler('success');
    expect(
      await handler.handle('status', mqttRequest(Buffer.alloc(0))),
    ).toEqual(status);
  });

  it.each([
    ['an empty payload', Buffer.alloc(0), { limit: 100 }],
    [
      'a query',
      json({ since: '2026-10-26T14:56:00Z', limit: '2' }),
      { since: '2026-10-26T14:56:00Z', limit: 2 },
    ],
  ])('Should return the command history for %s', async (_, payload, query) => {
    const { handler, manager } = createHandler('success');

    const body = await handler.handle('history', mqttRequest(payload));

    expect(manager.checkHistory).toHaveBeenCalledWith(query);
    expect(body).toEqual([historyEntry]);
  });

  it.each([
    ['a payload that is not JSON', Buffer.from('limit=2')],
    ['a payload that is no object', json([])],
    ['a limit over 1000', json({ limit: 1001 })],
  ])('Should refuse the history for %s', async (_, payload) => {
    const { handler, manager } = createHandler('success');

    const body = await handler.handle('history', mqttRequest(payload));

    expect(manager.checkHistory).not.toHaveBeenCalled();
    expect(body).toMatchObject({ statusCode: 400 });
  });

  it('Should return the metrics of the digital twin', async () => {
    const { handler } = createHandler('success');
    expect(
      await handler.handle('metrics', mqttRequest(Buffer.alloc(0))),
    ).toEqual(metricsDocument);
  });

  it('Should return the descriptor of the digital twin', async () => {
    const { handler } = createHandler('success');
    expect(await handler.handle('dt', mqttRequest(Buffer.alloc(0)))).toEqual(
      dt,
    );
  });

  it('Should return the state document of the digital twin', async () => {
    const { handler } = createHandler('success');
    expect(await handler.handle('state', mqttRequest(Buffer.alloc(0)))).toEqual(
      stateDocument,
    );
  });

  it('Should report the health with MQTT connected', async () => {
    const { handler } = createHandler('success');

    expect(
      await handler.handle('health', mqttRequest(Buffer.alloc(0))),
    ).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
      mqtt: 'connected',
      database: 'file',
      scripts: null,
    });
  });

  it('Should return the HTTP 500 body when the request fails', async () => {
    const { handler, manager } = createHandler('success');
    manager.newCommand.mockRejectedValueOnce(new Error('spawn failed'));
    jest.spyOn(handler['logger'], 'error').mockImplementation(() => undefined);

    const body = await handler.handle(
      'execute',
      mqttRequest(json({ name: 'create' })),
    );

    expect(body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  describe('state machine', () => {
    const validationError = {
      message: 'Validation Failed',
      error: 'Bad Request',
      statusCode: 400,
    };

    it('Should pass a transition request on', async () => {
      const { handler, fsm } = createHandler('success');

      const body = await handler.handle(
        'transition',
        mqttRequest(json({ state: 'create' }), 'key-1'),
      );

      expect(fsm.transition).toHaveBeenCalledWith('create', 'key-1');
      expect(body).toEqual({ status: 'accepted', state: 'create' });
    });

    it('Should pass an event on', async () => {
      const { handler, fsm } = createHandler('success');

      await handler.handle('event', mqttRequest(json({ event: 'stop' })));

      expect(fsm.event).toHaveBeenCalledWith('stop', undefined);
    });

    it.each([
      ['transition', json({ name: 'create' }), undefined],
      ['event', Buffer.from('stop'), undefined],
      ['event', json({ event: 'stop' }), 'k'.repeat(256)],
    ] as const)(
      'Should return the validation error for a bad %s request',
      async (route, payload, requestKey) => {
        const { handler, fsm } = createHandler('success');

        const body = await handler.handle(
          route,
          mqttRequest(payload, requestKey),
        );

        expect(body).toEqual(validationError);
        expect(fsm.transition).not.toHaveBeenCalled();
        expect(fsm.event).not.toHaveBeenCalled();
      },
    );

    it('Should return the state of the machine', async () => {
      const { handler, fsm } = createHandler('success');
      const state = { state: null, status: 'none', entry: 0, events: [] };
      fsm.check.mockReturnValueOnce(state);

      expect(await handler.handle('fsm', mqttRequest(Buffer.alloc(0)))).toEqual(
        state,
      );
    });

    it('Should answer that there is no state machine', async () => {
      const { handler } = createHandler('success');

      expect(await handler.handle('fsm', mqttRequest(Buffer.alloc(0)))).toEqual(
        {
          status: 'no state machine',
          state: null,
        },
      );
    });
  });
});
