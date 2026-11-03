import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import amqp from 'amqplib';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { amqpConnector } from 'src/broker/amqp.broker';
import testConfig from 'test/helpers/config';

describe('amqpConnector', () => {
  let tempDir = '';
  let passwordFile = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-signals-amqp-'));
    passwordFile = path.join(tempDir, 'password');
    await writeFile(passwordFile, 'pa55word\n');
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  function captureConnect() {
    return jest.spyOn(amqp, 'connect').mockResolvedValue({} as never);
  }

  it('connects to the vhost as the service user with the password from its file', async () => {
    const spy = captureConnect();
    const config = testConfig({
      'rabbitmq-url': 'amqp://broker',
      'rabbitmq-password-file': passwordFile,
    });
    await amqpConnector(config)('alice');
    const [options, socket] = spy.mock.calls[0] as unknown as [
      Record<string, unknown>,
      object,
    ];
    expect(options).toMatchObject({
      protocol: 'amqp',
      hostname: 'broker',
      port: 5672,
      username: 'dtaas-signals',
      password: 'pa55word',
      vhost: 'alice',
    });
    expect(socket).toEqual({});
  });

  it('verifies the certificate on amqps', async () => {
    const spy = captureConnect();
    const config = testConfig({
      'rabbitmq-url': 'amqps://broker.example.org:5999',
      'rabbitmq-password-file': passwordFile,
    });
    await amqpConnector(config)('/');
    const [options, socket] = spy.mock.calls[0] as unknown as [
      Record<string, unknown>,
      object,
    ];
    expect(options).toMatchObject({
      protocol: 'amqps',
      port: 5999,
      vhost: '/',
    });
    expect(socket).toEqual({
      servername: 'broker.example.org',
      rejectUnauthorized: true,
    });
  });

  it('does not connect without a password file', async () => {
    const spy = captureConnect();
    await expect(amqpConnector(testConfig())('alice')).rejects.toThrow(
      /not configured/,
    );
    expect(spy).not.toHaveBeenCalled();
  });
});
