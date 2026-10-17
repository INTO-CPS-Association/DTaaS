import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import type {
  IClientOptions,
  IClientPublishOptions,
  IPublishPacket,
  MqttClient,
} from 'mqtt';
import Config from '../config/configuration.service.js';
import MqttRequestHandler from './mqtt-request.handler.js';
import {
  defaultResponseTopic,
  MqttConfig,
  MqttRoute,
  mqttRoutes,
  requestTopic,
} from './mqtt.config.js';

export type MqttConnect = (url: string, options: IClientOptions) => MqttClient;

export const MQTT_CONNECT = Symbol('MQTT_CONNECT');

// Serves the runner API over MQTT. Each HTTP route has a request topic,
// and the reply goes to the MQTT 5 response topic of the request, or
// else to the request topic with a "/response" suffix.
@Injectable()
export default class MqttService implements OnApplicationShutdown {
  private readonly logger = new Logger(MqttService.name);

  private client: MqttClient | undefined;

  private routes = new Map<string, MqttRoute>();

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly handler: MqttRequestHandler,
    @Inject(MQTT_CONNECT) private readonly connect: MqttConnect,
  ) {} // eslint-disable-line no-empty-function

  start(): void {
    const options = this.config.getMqtt();
    if (options === undefined) {
      return;
    }
    this.routes = new Map(
      mqttRoutes.map((route) => [requestTopic(options.topic, route), route]),
    );
    const client = this.connect(
      options.url,
      MqttService.clientOptions(options),
    );
    this.client = client;
    // the url may hold credentials, so log only its host
    this.listen(client, new URL(options.url).host);
    client.subscribe([...this.routes.keys()], { qos: 1 }, (error) => {
      if (error) {
        this.logger.error(`MQTT subscription failed: ${error.message}`);
      }
    });
  }

  private listen(client: MqttClient, host: string): void {
    client.on('connect', () =>
      this.logger.log(`Connected to MQTT broker at ${host}`),
    );
    client.on('error', (error) =>
      this.logger.error(`MQTT error: ${error.message}`),
    );
    client.on('message', (topic, payload, packet) =>
      this.respond(topic, payload, packet),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client?.endAsync();
    this.client = undefined;
  }

  private static clientOptions(options: MqttConfig): IClientOptions {
    return {
      username: options.username,
      password: options.password,
      protocolVersion: options.protocolVersion,
    };
  }

  private async respond(
    topic: string,
    payload: Buffer,
    packet: IPublishPacket,
  ): Promise<void> {
    const route = this.routes.get(topic);
    if (route === undefined || this.client === undefined) {
      return;
    }
    const client = this.client;
    try {
      const body = await this.handler.handle(route, payload);
      const { responseTopic, correlationData } = packet.properties ?? {};
      await client.publishAsync(
        responseTopic ?? defaultResponseTopic(topic),
        JSON.stringify(body),
        MqttService.publishOptions(correlationData),
      );
    } catch (error) {
      this.logger.error(`MQTT request on ${topic} failed: ${error}`);
    }
  }

  private static publishOptions(
    correlationData: Buffer | undefined,
  ): IClientPublishOptions {
    if (correlationData === undefined) {
      return { qos: 1 };
    }
    return { qos: 1, properties: { correlationData } };
  }
}
