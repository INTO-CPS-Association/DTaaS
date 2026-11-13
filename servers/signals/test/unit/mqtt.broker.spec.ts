import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { IClientOptions, MqttClient } from 'mqtt';
import type { BrokerListener, BrokerMessage } from 'src/broker/broker';
import MqttBroker, { clientIdOf } from 'src/broker/mqtt.broker';
import testConfig from 'test/helpers/config';

/** An MQTT client in memory that records what the broker asks of it. */
class FakeClient extends EventEmitter {
  connected = true;
  readonly subscribed: string[][] = [];
  readonly unsubscribed: string[][] = [];
  ended = false;

  refused = new Set<string>();

  release: () => void = () => undefined;

  /** When set, a SUBACK waits until release() is called. */
  hold = false;

  async subscribeAsync(topic: string | string[]) {
    const topics = Array.isArray(topic) ? topic : [topic];
    this.subscribed.push(topics);
    if (this.hold) {
      await new Promise<void>((resolve) => {
        this.release = resolve;
      });
    }
    return topics.map((name) => ({
      topic: name,
      qos: this.refused.has(name) ? 135 : 0,
    }));
  }

  async unsubscribeAsync(topics: string[]) {
    this.unsubscribed.push(topics);
  }

  end() {
    this.ended = true;
    this.connected = false;
  }

  async endAsync() {
    this.end();
  }
}

function listener() {
  const messages: BrokerMessage[] = [];
  let downs = 0;
  const value: BrokerListener = {
    onMessage: (message) => messages.push(message),
    onDown: () => {
      downs += 1;
    },
  };
  return { value, messages, downs: () => downs };
}

describe('MqttBroker', () => {
  let dir = '';
  let passwordFile = '';
  const connections: Array<{ url: string; options: IClientOptions }> = [];
  let clients: FakeClient[] = [];

  function brokerWith() {
    const config = testConfig({
      'mqtt-url': 'mqtts://broker.example:8883',
      'mqtt-password-file': passwordFile,
    });
    return new MqttBroker(config, async (url, options) => {
      connections.push({ url, options });
      const client = new FakeClient();
      clients.push(client);
      return client as unknown as MqttClient;
    });
  }

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    dir = await mkdtemp(path.join(os.tmpdir(), 'signals-mqtt-'));
    passwordFile = path.join(dir, 'rabbitmq_dtaas_signals_password');
    await writeFile(passwordFile, 'broker-secret\n', { mode: 0o600 });
    connections.length = 0;
    clients = [];
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('connects once as the service account, with the password from its file and a clean session', async () => {
    const broker = brokerWith();
    await broker.subscribe(['a/b'], listener().value);
    await broker.subscribe(['a/c'], listener().value);
    expect(connections).toHaveLength(1);
    expect(connections[0].url).toBe('mqtts://broker.example:8883');
    expect(connections[0].options).toMatchObject({
      username: 'dtaas_signals',
      password: 'broker-secret',
      protocolVersion: 5,
      clean: true,
      reconnectPeriod: 0,
      rejectUnauthorized: true,
    });
  });

  it('subscribes a topic once for two streams and unsubscribes it when the last one closes', async () => {
    const broker = brokerWith();
    const first = listener();
    const second = listener();
    const one = await broker.subscribe(['a/b'], first.value);
    const two = await broker.subscribe(['a/b', 'a/c'], second.value);
    expect(clients[0].subscribed).toEqual([['a/b'], ['a/c']]);
    clients[0].emit('message', 'a/b', Buffer.from('x'));
    expect(first.messages).toHaveLength(1);
    expect(second.messages).toHaveLength(1);
    await one.close();
    expect(clients[0].unsubscribed).toEqual([]);
    await two.close();
    expect(clients[0].unsubscribed).toEqual([['a/b', 'a/c']]);
  });

  it('tells every stream when the connection closes and connects again for the next one', async () => {
    const broker = brokerWith();
    const watcher = listener();
    await broker.subscribe(['a/b'], watcher.value);
    clients[0].emit('close');
    expect(watcher.downs()).toBe(1);
    clients[0].emit('message', 'a/b', Buffer.from('late'));
    expect(watcher.messages).toHaveLength(0);
    await broker.subscribe(['a/b'], listener().value);
    expect(connections).toHaveLength(2);
    expect(clients[1].subscribed).toEqual([['a/b']]);
  });

  it('fails a subscription when the password file is missing, and tries again next time', async () => {
    const config = testConfig({ 'mqtt-password-file': '' });
    let attempts = 0;
    const broker = new MqttBroker(config, async () => {
      attempts += 1;
      return new FakeClient() as unknown as MqttClient;
    });
    await expect(broker.subscribe(['a/b'], listener().value)).rejects.toThrow(
      'mqtt-password-file is not configured',
    );
    await expect(broker.subscribe(['a/b'], listener().value)).rejects.toThrow();
    expect(attempts).toBe(0);
  });

  it('fails a subscription the broker refuses and keeps no listener for it', async () => {
    const broker = brokerWith();
    await broker.subscribe(['a/b'], listener().value);
    clients[0].refused.add('bob/x');
    const watcher = listener();
    await expect(broker.subscribe(['bob/x'], watcher.value)).rejects.toThrow(
      'The broker refused a subscription',
    );
    clients[0].emit('message', 'bob/x', Buffer.from('x'));
    expect(watcher.messages).toHaveLength(0);
  });

  it('refuses every stream that asked for a topic while its refusal was pending', async () => {
    const broker = brokerWith();
    await broker.subscribe(['a/b'], listener().value);
    const client = clients[0];
    client.refused.add('bob/x');
    client.hold = true;
    const first = broker.subscribe(['bob/x'], listener().value);
    await new Promise((resolve) => setImmediate(resolve));
    const second = broker.subscribe(['bob/x'], listener().value);
    client.release();
    await expect(first).rejects.toThrow('The broker refused a subscription');
    await expect(second).rejects.toThrow('The broker refused a subscription');
    expect(client.subscribed.filter((t) => t[0] === 'bob/x')).toHaveLength(1);
    client.hold = false;
    client.refused.clear();
    await broker.subscribe(['bob/x'], listener().value);
    expect(client.subscribed.filter((t) => t[0] === 'bob/x')).toHaveLength(2);
  });

  it('logs a connection error instead of ending the process', async () => {
    const broker = brokerWith();
    await broker.subscribe(['a/b'], listener().value);
    expect(() =>
      clients[0].emit('error', new Error('keepalive timeout')),
    ).not.toThrow();
  });

  it('ends the connection when the module stops', async () => {
    const broker = brokerWith();
    await broker.subscribe(['a/b'], listener().value);
    await broker.onModuleDestroy();
    expect(clients[0].ended).toBe(true);
  });
});

describe('clientIdOf', () => {
  it('names the account and the host in snake_case', () => {
    expect(clientIdOf('dtaas_signals', 'Gateway-01.local')).toBe(
      'dtaas_signals_gateway_01_local',
    );
  });
});
