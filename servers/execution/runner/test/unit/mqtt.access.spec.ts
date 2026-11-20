import { describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import Access from 'src/auth/access';
import DescriptorService from 'src/descriptor.service';
import ExecaManager from 'src/execa-manager.service';
import FsmService from 'src/fsm/fsm.service';
import MqttRequestHandler from 'src/mqtt/mqtt-request.handler';
import { mqttPayload, newCaller } from 'test/sign.util';
import {
  FakeClient,
  fakeDescriptor,
  fakeManager,
  message,
  mqttConfig,
  packet,
  setup,
} from './mqtt.fixture';

const manager = newCaller('manager-1');

const access = () =>
  new Access(
    [{ name: 'manager-1', role: 'manager', publicKey: manager.publicKey }],
    'hospital-1',
  );

const TOPIC = 'dtaas/runner/execute';

const replyOf = (client: FakeClient) =>
  JSON.parse(String(client.publishAsync.mock.calls[0]?.[1]));

describe('MQTT service with access control', () => {
  it('Should hand the body and principal of an envelope on', async () => {
    const { client, handle, service } = setup(mqttConfig, access());
    service.start();
    const payload = mqttPayload(manager, 'hospital-1', TOPIC, { name: 'a' });

    await message(client, TOPIC, payload, packet());

    expect(handle).toHaveBeenCalledWith('execute', {
      body: { name: 'a' },
      requestKey: undefined,
      principal: { name: 'manager-1', role: 'manager' },
    });
  });

  it('Should answer a plain payload with a 401', async () => {
    const { client, handle, service } = setup(mqttConfig, access());
    service.start();

    await message(client, TOPIC, Buffer.from('{"name":"a"}'), packet());

    expect(handle).not.toHaveBeenCalled();
    expect(replyOf(client)).toEqual({
      statusCode: 401,
      message: 'missing credential',
      error: 'Unauthorized',
    });
  });

  it('Should log an unexpected failure to open a request', async () => {
    const control = access();
    jest.spyOn(control, 'mqtt').mockImplementation(() => {
      throw new Error('broken');
    });
    const { client, handle, service } = setup(mqttConfig, control);
    service.start();
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await message(client, TOPIC, Buffer.from('x.y.z'), packet());

    expect(handle).not.toHaveBeenCalled();
    expect(client.publishAsync).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      `MQTT response on ${TOPIC} failed: Error: broken`,
    );
    log.mockRestore();
  });

  it('Should answer health without a credential', async () => {
    const { client, handle, service } = setup(mqttConfig, access());
    service.start();

    await message(client, 'dtaas/runner/health', Buffer.alloc(0), packet());

    expect(handle).toHaveBeenCalledWith('health', {
      body: undefined,
      requestKey: undefined,
    });
  });
});

describe('MQTT request handler with a principal', () => {
  function createHandler() {
    const executor = fakeManager('success');
    const fsm = {
      environment: jest.fn(() => ({})),
      declared: () => ({ managerCommands: ['admit'] }),
    };
    const handler = new MqttRequestHandler(
      executor as unknown as ExecaManager,
      fsm as unknown as FsmService,
      fakeDescriptor() as unknown as DescriptorService,
    );
    return { handler, executor };
  }

  const principal = { name: 'manager-1', role: 'manager' } as const;

  it('Should execute a listed command and pass its caller on', async () => {
    const { handler, executor } = createHandler();

    await handler.handle('execute', { body: { name: 'admit' }, principal });

    expect(executor.newCommand).toHaveBeenCalledWith('admit', undefined, {
      env: {},
      by: 'manager-1',
    });
  });

  it.each([
    ['execute', { name: 'open' }, 'manager may not call execute'],
    ['stop', {}, 'manager may not call stop'],
    ['transition', { bad: 1 }, 'manager may not call transition'],
  ] as const)('Should refuse %s with a 403', async (route, body, message) => {
    const { handler, executor } = createHandler();

    const reply = await handler.handle(route, { body, principal });

    expect(reply).toEqual({ statusCode: 403, message, error: 'Forbidden' });
    expect(executor.newCommand).not.toHaveBeenCalled();
    expect(executor.stop).not.toHaveBeenCalled();
  });
});
