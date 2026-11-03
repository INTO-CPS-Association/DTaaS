import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import amqp from 'amqplib';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import AmqpBroker from 'src/broker/amqp.broker';
import type { BrokerMessage } from 'src/broker/broker';
import testConfig from 'test/helpers/config';
import { waitFor } from 'test/helpers/sse-client';

// Pinned by digest, so the test runs against the image that was reviewed.
const IMAGE =
  'rabbitmq:4.2.8-management@sha256:2f5f2d5551a7c11e09c57b00ff6a86f363ddd424e3bde3a54c88a75c742a81e8';
const VHOST = 'alice';
const SERVICE_USER = 'dtaas-signals';
const dockerAvailable =
  spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;
const describeWithDocker = dockerAvailable ? describe : describe.skip;

function docker(args: string[], input?: string): string {
  return execFileSync('docker', args, { input, encoding: 'utf8' }).trim();
}

// Readiness is read from the container log. A 'docker exec' of rabbitmqctl
// while the node boots creates the Erlang cookie as root, and the node then
// fails to start.
async function waitUntilRunning(container: string): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const logs = spawnSync('docker', ['logs', container], { encoding: 'utf8' });
    if (`${logs.stdout}${logs.stderr}`.includes('Server startup complete'))
      return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('RabbitMQ did not start');
}

// The same commands DEVELOPER.md documents for a deployment. The password
// goes in on stdin, never as an argument.
const SERVICE_PERMISSIONS = [
  '^dtaas-signals\\..*',
  '^dtaas-signals\\..*',
  '^(amq\\.topic|dtaas-signals\\..*)$',
];

function createUsers(
  container: string,
  servicePassword: string,
  publisherPassword: string,
): void {
  const ctl = (args: string[], input?: string) =>
    docker(['exec', '-i', container, 'rabbitmqctl', ...args], input);
  ctl(['add_vhost', VHOST]);
  ctl(['add_user', SERVICE_USER], `${servicePassword}\n`);
  ctl(['set_permissions', '-p', VHOST, SERVICE_USER, ...SERVICE_PERMISSIONS]);
  ctl([
    'set_topic_permissions',
    '-p',
    VHOST,
    SERVICE_USER,
    'amq.topic',
    '^$',
    '.*',
  ]);
  ctl(['add_user', 'publisher'], `${publisherPassword}\n`);
  ctl(['set_permissions', '-p', VHOST, 'publisher', '.*', '.*', '.*']);
}

describeWithDocker('RabbitMQ with the read-only service user', () => {
  const servicePassword = randomBytes(16).toString('hex');
  const publisherPassword = randomBytes(16).toString('hex');
  let container = '';
  let port = '';
  let tempDir = '';
  let broker: AmqpBroker;

  const urlFor = (user: string, password: string) =>
    `amqp://${user}:${password}@127.0.0.1:${port}/${VHOST}`;

  beforeAll(async () => {
    container = docker([
      'run',
      '--detach',
      '--rm',
      '--publish',
      '127.0.0.1::5672',
      IMAGE,
    ]);
    port = docker(['port', container, '5672/tcp']).split(':').pop() ?? '';
    await waitUntilRunning(container);
    createUsers(container, servicePassword, publisherPassword);
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-signals-int-'));
    const passwordFile = path.join(tempDir, 'password');
    await writeFile(passwordFile, servicePassword);
    broker = new AmqpBroker(
      testConfig({
        'rabbitmq-url': `amqp://127.0.0.1:${port}`,
        'rabbitmq-password-file': passwordFile,
      }),
    );
  }, 180_000);

  afterAll(async () => {
    await broker?.onModuleDestroy();
    if (container !== '') docker(['stop', container]);
    await rm(tempDir, { recursive: true, force: true });
  }, 60_000);

  it('receives what is published under a bound routing key', async () => {
    const received: BrokerMessage[] = [];
    const subscription = await broker.subscribe(VHOST, ['alice.pump.flow'], {
      onMessage: (message) => received.push(message),
      onDown: () => undefined,
    });
    const publisher = await amqp.connect(
      urlFor('publisher', publisherPassword),
    );
    const channel = await publisher.createChannel();
    channel.publish('amq.topic', 'alice.pump.other', Buffer.from('not bound'));
    channel.publish('amq.topic', 'alice.pump.flow', Buffer.from('{"value":7}'));
    await waitFor(() => received.length > 0, 10_000);
    expect(received.map((m) => m.body.toString())).toEqual(['{"value":7}']);
    await publisher.close();
    await subscription.close();
  }, 30_000);

  it('cannot publish as the service user', async () => {
    const connection = await amqp.connect(
      urlFor(SERVICE_USER, servicePassword),
    );
    const channel = await connection.createChannel();
    const refused = new Promise<Error>((resolve) =>
      channel.on('error', resolve),
    );
    channel.publish('amq.topic', 'alice.pump.flow', Buffer.from('forged'));
    await expect(refused).resolves.toHaveProperty(
      'message',
      expect.stringMatching(/ACCESS_REFUSED/),
    );
    await connection.close();
  }, 30_000);

  it('cannot declare a queue outside its prefix', async () => {
    const connection = await amqp.connect(
      urlFor(SERVICE_USER, servicePassword),
    );
    const channel = await connection.createChannel();
    channel.on('error', () => undefined);
    await expect(
      channel.assertQueue('other-queue', { exclusive: true }),
    ).rejects.toThrow(/ACCESS_REFUSED/);
    await connection.close();
  }, 30_000);
});
