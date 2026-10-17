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
  isPublishableTopic,
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
    // The client retries every second while the broker is down, so log
    // an error only when it differs from the previous one
    let lastError: string | undefined;
    client.on('connect', () => {
      lastError = undefined;
      this.logger.log(`Connected to MQTT broker at ${host}`);
    });
    client.on('error', ({ message }) => {
      if (message !== lastError) {
        this.logger.error(`MQTT error: ${message}`);
      }
      lastError = message;
    });
    client.on('message', (topic, payload, packet) =>
      this.respond(client, topic, payload, packet),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    // force, as a graceful end waits for unacknowledged replies forever
    await this.client?.endAsync(true);
    this.client = undefined;
  }

  private static clientOptions(options: MqttConfig): IClientOptions {
    return {
      username: options.username,
      password: options.password,
      protocolVersion: options.protocolVersion,
      // keep retrying after the broker refuses the connection too
      reconnectOnConnackError: true,
    };
  }

  private async respond(
    client: MqttClient,
    topic: string,
    payload: Buffer,
    packet: IPublishPacket,
  ): Promise<void> {
    const route = this.routes.get(topic);
    if (route === undefined) {
      return;
    }
    // the broker hands a retained request to every new subscription,
    // which would run its command again on each start and reconnect
    if (packet.retain) {
      this.logger.warn(`Ignored a retained request on ${topic}`);
      return;
    }
    try {
      const body = await this.handler.handle(route, payload);
      await client.publishAsync(
        this.responseTopic(topic, packet),
        JSON.stringify(body),
        MqttService.publishOptions(packet.properties?.correlationData),
      );
    } catch (error) {
      this.logger.error(`MQTT response on ${topic} failed: ${error}`);
    }
  }

  // Fall back to the default response topic when the requested one can
  // not be published to, or would turn the response into a new request
  private responseTopic(topic: string, packet: IPublishPacket): string {
    const responseTopic = packet.properties?.responseTopic;
    if (
      responseTopic === undefined ||
      !isPublishableTopic(responseTopic) ||
      this.routes.has(responseTopic)
    ) {
      return defaultResponseTopic(topic);
    }
    return responseTopic;
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
