import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import mqtt from 'mqtt';
import type { BrokerMessage } from 'src/broker/broker';
import MqttBroker from 'src/broker/mqtt.broker';
import testConfig from 'test/helpers/config';
import { reading } from 'test/helpers/fake-broker';
import { waitFor } from 'test/helpers/sse-client';

// Pinned by digest, so the test runs against the image that was reviewed.
const IMAGE =
  'rabbitmq:4.4.0-management@sha256:af6f50d38098d8bd52fef7f3fa85015dd8b2bf6def58e995bf584ae9ba0f6407';
const SERVICE_USER = 'dtaas_signals';
const DEVICE_USER = 'alice_device';
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

// The permissions the plan gives the accounts in the virtual host '/': the
// gateway reads the topics of the projects it serves and the device writes
// the topics of its own project. Passwords go in on stdin.
function createUsers(container: string, passwords: Record<string, string>) {
  const ctl = (args: string[], input?: string) =>
    docker(['exec', '-i', container, 'rabbitmqctl', ...args], input);
  Object.entries(passwords).forEach(([user, password]) => {
    ctl(['add_user', user], `${password}\n`);
    const queue = `^(amq\\.topic|mqtt-subscription-${user}_.*)$`;
    ctl(['set_permissions', '-p', '/', user, queue, queue, queue]);
  });
  ctl([
    'set_topic_permissions',
    '-p',
    '/',
    SERVICE_USER,
    'amq.topic',
    '^alice\\..*\\.cmd\\..*',
    '^alice\\.',
  ]);
  ctl([
    'set_topic_permissions',
    '-p',
    '/',
    DEVICE_USER,
    'amq.topic',
    '^alice\\.',
    '^alice\\..*\\.cmd\\.',
  ]);
}

describeWithDocker('MqttBroker against RabbitMQ', () => {
  const container = `signals-mqtt-int-${randomBytes(4).toString('hex')}`;
  const passwords = {
    [SERVICE_USER]: randomBytes(16).toString('hex'),
    [DEVICE_USER]: randomBytes(16).toString('hex'),
  };
  let dir = '';
  let url = '';
  let broker: MqttBroker;

  beforeAll(async () => {
    docker([
      'run',
      '-d',
      '--rm',
      '--name',
      container,
      '-p',
      '127.0.0.1::1883',
      '--entrypoint',
      'sh',
      IMAGE,
      '-c',
      'rabbitmq-plugins enable --offline rabbitmq_mqtt && exec docker-entrypoint.sh rabbitmq-server',
    ]);
    await waitUntilRunning(container);
    createUsers(container, passwords);
    url = `mqtt://${docker(['port', container, '1883/tcp']).split('\n')[0]}`;
    dir = await mkdtemp(path.join(os.tmpdir(), 'signals-mqtt-int-'));
    const passwordFile = path.join(dir, 'rabbitmq_dtaas_signals_password');
    await writeFile(passwordFile, passwords[SERVICE_USER], { mode: 0o600 });
    broker = new MqttBroker(
      testConfig({ 'mqtt-url': url, 'mqtt-password-file': passwordFile }),
    );
  }, 180_000);

  afterAll(async () => {
    await broker?.onModuleDestroy();
    spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
    if (dir !== '') await rm(dir, { recursive: true, force: true });
  });

  it('delivers a reading a device publishes on a topic of its project', async () => {
    const received: BrokerMessage[] = [];
    const subscription = await broker.subscribe(['alice/pump/flow'], {
      onMessage: (message) => received.push(message),
      onDown: () => undefined,
    });
    const device = await mqtt.connectAsync(url, {
      username: DEVICE_USER,
      password: passwords[DEVICE_USER],
      clientId: `${DEVICE_USER}_test`,
    });
    await device.publishAsync('alice/pump/flow', reading(4.5));
    await waitFor(() => received.length === 1);
    expect(JSON.parse(received[0].body.toString())).toMatchObject({
      value: 4.5,
    });
    await device.endAsync();
    await subscription.close();
  }, 30_000);

  it('delivers a command to the device and refuses one outside cmd', async () => {
    const received: BrokerMessage[] = [];
    const stream = await broker.subscribe(['alice/pump/flow'], {
      onMessage: (message) => received.push(message),
      onDown: () => undefined,
    });
    const commands: string[] = [];
    const device = await mqtt.connectAsync(url, {
      username: DEVICE_USER,
      password: passwords[DEVICE_USER],
      clientId: `${DEVICE_USER}_valve`,
    });
    device.on('message', (topic) => commands.push(topic));
    await device.subscribeAsync('alice/CTO/plant/01/loop1/A/A-0001/cmd/set');
    await broker.publish(
      'alice/CTO/plant/01/loop1/A/A-0001/cmd/set',
      reading(40),
    );
    await waitFor(() => commands.length === 1);
    await expect(
      Promise.race([
        broker.publish('alice/pump/flow', reading(1)),
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error('no answer')), 5000);
        }),
      ]),
    ).rejects.toThrow(/^(?!no answer)/);
    // Over MQTT 5 the refusal keeps the connection, so open streams go on.
    await device.publishAsync('alice/pump/flow', reading(2));
    await waitFor(() => received.length === 1);
    await stream.close();
    await device.endAsync();
  }, 30_000);

  it('refuses a topic outside the read permission of the gateway', async () => {
    await expect(
      broker.subscribe(['bob/pump/flow'], {
        onMessage: () => undefined,
        onDown: () => undefined,
      }),
    ).rejects.toThrow();
    // The refusal leaves the connection in use for the topics it may read.
    const again = await broker.subscribe(['alice/pump/flow'], {
      onMessage: () => undefined,
      onDown: () => undefined,
    });
    await again.close();
  }, 30_000);
});
