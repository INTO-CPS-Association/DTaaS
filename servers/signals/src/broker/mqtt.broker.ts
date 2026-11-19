import { Logger, type OnModuleDestroy } from '@nestjs/common';
import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import os from 'node:os';
import Config from '../config/config.service.js';
import readSecretFile from '../config/secrets.js';
import BindingTable from './binding-table.js';
import type {
  BrokerListener,
  BrokerSubscription,
  SignalBroker,
} from './broker.js';

/** Opens one MQTT connection. A test passes its own. */
export type MqttConnector = (
  url: string,
  options: IClientOptions,
) => Promise<MqttClient>;

const SUBACK_FAILURE = 128;

const connectMqtt: MqttConnector = (url, options) =>
  mqtt.connectAsync(url, options, false);

// One client id per gateway host, as the naming convention gives programs:
// '<account>_<host>' in snake_case.
export function clientIdOf(user: string, host = os.hostname()): string {
  const name = host.toLowerCase().replaceAll(/[^a-z0-9]+/g, '_');
  return `${user}_${name}`;
}

/**
 * Live signals from RabbitMQ over MQTT, on one connection per gateway. A
 * topic is subscribed once however many streams want it. When the
 * connection drops, every stream is told and the next stream connects again,
 * so a reconnect never resumes a subscription that access no longer allows.
 */
export default class MqttBroker implements SignalBroker, OnModuleDestroy {
  private readonly logger = new Logger(MqttBroker.name);
  private readonly table = new BindingTable<BrokerListener>();
  private readonly subscriptions = new Map<string, Promise<void>>();
  private client?: Promise<MqttClient>;

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly connector: MqttConnector = connectMqtt,
  ) {} // eslint-disable-line no-empty-function

  async subscribe(
    topics: readonly string[],
    listener: BrokerListener,
  ): Promise<BrokerSubscription> {
    const client = await this.connection();
    topics.forEach((topic) => this.table.add(topic, listener));
    try {
      await Promise.all(topics.map((topic) => this.subscribed(client, topic)));
    } catch (error) {
      await this.release(client, topics, listener);
      throw error;
    }
    return { close: () => this.release(client, topics, listener) };
  }

  async onModuleDestroy(): Promise<void> {
    const client = await this.client?.catch(() => undefined);
    await client?.endAsync(true);
  }

  // One SUBSCRIBE per topic, shared by every stream that asks for the topic
  // while it is pending. A stream that arrives during a refusal is refused
  // too, so no stream goes live on a topic the broker never subscribed.
  private subscribed(client: MqttClient, topic: string): Promise<void> {
    const known = this.subscriptions.get(topic);
    if (known !== undefined) return known;
    const pending = this.subscribeOne(client, topic);
    this.subscriptions.set(topic, pending);
    pending.catch(() => {
      if (this.subscriptions.get(topic) === pending)
        this.subscriptions.delete(topic);
    });
    return pending;
  }

  // RabbitMQ refuses a topic outside the account's read permission with a
  // failure code in the SUBACK, which is checked as well as an error.
  private async subscribeOne(client: MqttClient, topic: string): Promise<void> {
    const granted = await client.subscribeAsync(topic, { qos: 0 });
    if (granted.some((grant) => grant.qos >= SUBACK_FAILURE)) {
      throw new Error('The broker refused a subscription');
    }
  }

  private async release(
    client: MqttClient,
    topics: readonly string[],
    listener: BrokerListener,
  ): Promise<void> {
    const unused = topics.filter((topic) => this.table.remove(topic, listener));
    unused.forEach((topic) => this.subscriptions.delete(topic));
    if (unused.length === 0 || !client.connected) return;
    await client.unsubscribeAsync(unused).catch(() => undefined);
  }

  private connection(): Promise<MqttClient> {
    this.client ??= this.open().catch((error: unknown) => {
      this.client = undefined;
      throw error;
    });
    return this.client;
  }

  private async open(): Promise<MqttClient> {
    const client = await this.connector(this.config.get('mqtt-url'), {
      clientId: clientIdOf(this.config.get('mqtt-user')),
      username: this.config.get('mqtt-user'),
      password: await readSecretFile(
        this.config.get('mqtt-password-file'),
        'mqtt-password-file',
      ),
      // MQTT 5 answers a refused publication with a reason code, where MQTT
      // 3.1.1 closes the connection and with it every stream.
      protocolVersion: 5,
      clean: true,
      reconnectPeriod: 0,
      connectTimeout: this.config.get('mqtt-connect-timeout'),
      // Node verifies the broker certificate of mqtts:// by default. Saying
      // so here keeps an environment default from switching it off.
      rejectUnauthorized: true,
    });
    client.on('message', (topic, body) => this.deliver(topic, body));
    // Without a listener, an 'error' event after the connection is up would
    // end the process. The 'close' that follows tells every stream.
    client.on('error', (error) =>
      this.logger.warn(`MQTT connection error: ${error.message}`),
    );
    client.on('close', () => this.lost(client));
    return client;
  }

  private deliver(topic: string, body: Buffer): void {
    this.table
      .listenersOf(topic)
      .forEach((listener) => listener.onMessage({ topic, body }));
  }

  private lost(client: MqttClient): void {
    this.logger.warn('The MQTT connection closed');
    this.client = undefined;
    const listeners = this.table.allListeners();
    this.table.clear();
    this.subscriptions.clear();
    listeners.forEach((listener) => listener.onDown());
    client.end(true);
  }
}
