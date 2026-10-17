import { describe, expect, it, jest } from '@jest/globals';
import ExecaManager from 'src/execa-manager.service';
import MqttRequestHandler from 'src/mqtt/mqtt-request.handler';

const status = {
  name: 'create',
  status: 'valid',
  logs: { stdout: 'hello world', stderr: '' },
};

function createHandler(success: boolean) {
  const manager = {
    newCommand: jest.fn(async (_name: string) => [success, new Map()]),
    checkStatus: jest.fn(() => status),
    checkHistory: jest.fn(() => [{ name: 'create' }]),
  };
  const handler = new MqttRequestHandler(manager as unknown as ExecaManager);
  return { handler, manager };
}

const json = (body: unknown) => Buffer.from(JSON.stringify(body));

describe('MQTT request handler', () => {
  it('Should report a successful command execution', async () => {
    const { handler, manager } = createHandler(true);

    const body = await handler.handle('execute', json({ name: 'create' }));

    expect(manager.newCommand).toHaveBeenCalledWith('create');
    expect(body).toEqual({ status: 'success' });
  });

  it('Should report an invalid command', async () => {
    const { handler } = createHandler(false);

    const body = await handler.handle('execute', json({ name: 'test' }));

    expect(body).toEqual({ status: 'invalid command' });
  });

  it.each([
    ['a wrongly shaped request', json({ command: 'create' })],
    ['a request that is not JSON', Buffer.from('create')],
    ['an empty request', Buffer.alloc(0)],
  ])('Should return the validation error for %s', async (_, payload) => {
    const { handler, manager } = createHandler(true);

    const body = await handler.handle('execute', payload);

    expect(manager.newCommand).not.toHaveBeenCalled();
    expect(body).toEqual({
      message: 'Validation Failed',
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('Should return the status of the last command', async () => {
    const { handler } = createHandler(true);
    expect(await handler.handle('status', Buffer.alloc(0))).toEqual(status);
  });

  it('Should return the command history', async () => {
    const { handler } = createHandler(true);
    expect(await handler.handle('history', Buffer.alloc(0))).toEqual([
      { name: 'create' },
    ]);
  });
});
