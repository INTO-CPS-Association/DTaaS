import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { IClientOptions, MqttClient } from 'mqtt';
import type { Subscription } from 'rxjs';
import {
  DIGITAL_TWINS_SERVICE,
  type IDigitalTwinsService,
} from '../digital-twins/interfaces/digital-twins.service.interface.js';
import { handleRequest } from './requests.js';
import { MQTT_SETTINGS, type ResolvedMqttSettings } from './settings.js';
import Topics from './topics.js';

export type MqttConnect = (url: string, options: IClientOptions) => MqttClient;

export const MQTT_CONNECT = Symbol('MQTT_CONNECT');

const RECONNECT_PERIOD_MS = 1000;

// At QoS 1, MQTT.js would resend a response whose topic the broker refuses
// on every reconnect, and the broker would close the connection each time.
const RESPONSE_QOS = 0;

const EVENT_QOS = 1;

// The URL may carry the broker's username and password.
function withoutCredentials(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    return parsed.href;
  } catch {
    return url;
  }
}

@Injectable()
export default class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);

  private readonly topics: Topics;

  private readonly broker: string;

  private client: MqttClient | undefined;

  private changes: Subscription | undefined;

  private unreachable = false;

  constructor(
    @Inject(MQTT_SETTINGS) private readonly settings: ResolvedMqttSettings,
    @Inject(DIGITAL_TWINS_SERVICE)
    private readonly digitalTwins: IDigitalTwinsService,
    @Inject(MQTT_CONNECT) private readonly connect: MqttConnect,
  ) {
    this.topics = new Topics(settings.baseTopic);
    this.broker = withoutCredentials(settings.url);
  }

  onModuleInit(): void {
    const client = this.connect(this.settings.url, {
      username: this.settings.username,
      password: this.settings.password,
      reconnectPeriod: RECONNECT_PERIOD_MS,
      reconnectOnConnackError: true,
    });
    client.on('connect', () => this.onConnect());
    client.on('offline', () => this.reportUnreachable('the connection closed'));
    client.on('error', (error) => this.onError(error));
    client.on('message', (topic, payload) => {
      void this.handleMessage(topic, payload.toString());
    });
    this.client = client;
    this.changes = this.digitalTwins.executionChanges().subscribe((record) => {
      const topic = this.topics.event(record.dtName, record.id);
      void this.publish(topic, record, EVENT_QOS);
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.changes?.unsubscribe();
    this.changes = undefined;
    if (this.client !== undefined) await this.client.endAsync(true);
    this.client = undefined;
  }

  private onConnect(): void {
    this.unreachable = false;
    this.logger.log(`Connected to MQTT broker ${this.broker}`);
    this.client?.subscribe(this.topics.requests(), { qos: 1 }, (error) => {
      if (error) this.logger.warn(`MQTT subscribe failed: ${error.message}`);
    });
  }

  private onError(error: Error): void {
    if (this.client?.connected) {
      this.logger.warn(`MQTT broker ${this.broker}: ${error.message}`);
    } else {
      this.reportUnreachable(error.message);
    }
  }

  /** Warns once per outage: MQTT.js reports an error for every attempt. */
  private reportUnreachable(reason: string): void {
    if (this.unreachable) return;
    this.unreachable = true;
    this.logger.warn(
      `MQTT broker ${this.broker} is unreachable, retrying every second: ${reason}`,
    );
  }

  private async handleMessage(topic: string, payload: string): Promise<void> {
    const operation = this.topics.operationOf(topic);
    if (operation === undefined) return;
    const handled = await handleRequest(
      this.digitalTwins,
      this.topics,
      operation,
      payload,
    );
    if (handled.unexpected !== undefined) {
      const { unexpected } = handled;
      this.logger.error(
        `MQTT request ${operation} failed`,
        unexpected instanceof Error ? unexpected.stack : String(unexpected),
      );
    }
    await this.publish(
      handled.responseTopic ?? this.topics.response(operation),
      handled.response,
      RESPONSE_QOS,
    );
  }

  private async publish(
    topic: string,
    body: unknown,
    qos: 0 | 1,
  ): Promise<void> {
    try {
      await this.client?.publishAsync(topic, JSON.stringify(body), {
        qos,
        retain: false,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`MQTT publish to ${topic} failed: ${reason}`);
    }
  }
}
