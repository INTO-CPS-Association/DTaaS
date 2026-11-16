import {
  Inject,
  Injectable,
  Logger,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import type { IClientOptions, IPublishPacket, MqttClient } from 'mqtt';
import { ROUTE_ROLES } from '../auth/roles.js';
import Config from '../config/configuration.service.js';
import { MqttHealth } from '../dto/health.dto.js';
import {
  NotificationDto,
  NotifyKind,
  offlineNotification,
} from '../dto/notify.dto.js';
import Changes, { ChangeListener } from '../notify/changes.js';
import MqttRequestHandler from './mqtt-request.handler.js';
import {
  openRequest,
  publishOptions,
  refusalBody,
  responseTopic,
} from './mqtt-request.js';
import settles from './settles.js';
import {
  clientOptions,
  MqttRoute,
  mqttRoutes,
  notifyTopic,
  requestTopic,
} from './mqtt.config.js';

export type MqttConnect = (url: string, options: IClientOptions) => MqttClient;

export const MQTT_CONNECT = Symbol('MQTT_CONNECT');

export type FollowListener = (payload: Buffer) => void;

// milliseconds that each step of leaving the broker may take
const LEAVE_TIMEOUT = 2000;

// Serves the runner API over MQTT. Each HTTP route has a request topic,
// and the reply goes to the MQTT 5 response topic of the request, or
// else to the request topic with a "/response" suffix.
@Injectable()
export default class MqttService implements BeforeApplicationShutdown {
  private readonly logger = new Logger(MqttService.name);

  private client: MqttClient | undefined;

  private routes = new Map<string, MqttRoute>();

  private readonly connects = new Changes();

  // Topics other than the request topics, such as the notify topics of
  // peers, and the listener of each
  private readonly follows = new Map<string, FollowListener>();

  constructor(
    private readonly config: Config,
    private readonly handler: MqttRequestHandler,
    @Inject(MQTT_CONNECT) private readonly connect: MqttConnect,
  ) {}

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
      clientOptions(options, this.config.getId(), this.config.getSigner()),
    );
    this.client = client;
    // the url may hold credentials, so log only its host
    this.listen(client, new URL(options.url).host);
    const topics = [...this.routes.keys(), ...this.follows.keys()];
    client.subscribe(topics, { qos: 1 }, this.subscribed);
  }

  private readonly subscribed = (error?: Error | null) => {
    if (error) {
      this.logger.error(`MQTT subscription failed: ${error.message}`);
    }
  };

  // Hands each message on the topic to the listener, retained or not,
  // instead of answering it. Without a client, start subscribes it;
  // mqtt.js subscribes again on reconnect.
  follow(topic: string, listener: FollowListener): void {
    this.follows.set(topic, listener);
    this.client?.subscribe(topic, { qos: 1 }, this.subscribed);
  }

  unfollow(topic: string): void {
    this.follows.delete(topic);
    this.client?.unsubscribe(topic);
  }

  private listen(client: MqttClient, host: string): void {
    // The client retries every second while the broker is down, so log
    // an error only when it differs from the previous one
    let lastError: string | undefined;
    client.on('connect', () => {
      lastError = undefined;
      this.logger.log(`Connected to MQTT broker at ${host}`);
      this.connects.emit();
    });
    client.on('error', ({ message }) => {
      if (message !== lastError) {
        this.logger.error(`MQTT error: ${message}`);
      }
      lastError = message;
    });
    client.on('message', (topic, payload, packet) => {
      const listener = this.follows.get(topic);
      return listener === undefined
        ? this.respond(client, payload, packet)
        : listener(payload);
    });
  }

  // Calls the listener on each connection to the broker, and at once if
  // the client is connected already. mqtt.js sets connected before it
  // emits connect, so a listener added in between is called twice, which
  // is harmless for the retained, idempotent online notice.
  onConnect(listener: ChangeListener): void {
    this.connects.on(listener);
    if (this.client?.connected) {
      listener();
    }
  }

  // Leaves the broker before the shutdown hooks, so that no request
  // starts a command while the runs in progress finish and the database
  // closes. Each step of the leave may take 2 s.
  async beforeApplicationShutdown(): Promise<void> {
    const { client } = this;
    if (client !== undefined) {
      await this.end(client, await this.leave());
      this.client = undefined;
    }
  }

  // Resolves with whether the offline notice was published or failed
  private leave(): Promise<boolean> {
    const time = new Date().toISOString();
    const offline = offlineNotification(this.config.getId(), time);
    return settles(this.notify('presence', offline, true), LEAVE_TIMEOUT);
  }

  // A graceful end makes the broker drop the will. A second end is a
  // no-op once a graceful one has begun, so only destroying the socket
  // stops a graceful end that waits for replies.
  private async end(client: MqttClient, published: boolean): Promise<void> {
    if (published && (await settles(client.endAsync(), LEAVE_TIMEOUT))) {
      return;
    }
    this.logger.warn(
      'The MQTT broker did not confirm the leave, so it may publish the will',
    );
    if (published) {
      client.stream.destroy();
    } else {
      await client.endAsync(true);
    }
  }

  status(): MqttHealth {
    if (this.config.getMqtt() === undefined) {
      return 'disabled';
    }
    return this.client?.connected ? 'connected' : 'disconnected';
  }

  private async respond(
    client: MqttClient,
    payload: Buffer,
    packet: IPublishPacket,
  ): Promise<void> {
    const { topic } = packet;
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
      const body = await this.answer(route, payload, packet);
      await client.publishAsync(
        responseTopic(topic, packet, (requested) => this.routes.has(requested)),
        this.config.getSigner().encode(body),
        publishOptions(packet.properties?.correlationData),
      );
    } catch (error) {
      this.logger.error(`MQTT response on ${topic} failed: ${error}`);
    }
  }

  // A public route takes a plain payload even with access control; a
  // refused credential is answered with the body of its HTTP reply
  private answer(
    route: MqttRoute,
    payload: Buffer,
    packet: IPublishPacket,
  ): unknown {
    const open = ROUTE_ROLES[route] === 'public';
    const access = open ? undefined : this.config.access();
    try {
      return this.handler.handle(route, openRequest(packet, payload, access));
    } catch (error) {
      return refusalBody(error);
    }
  }

  // Publishes a notification with QoS 1; while the broker is unreachable,
  // mqtt.js queues it and sends it on reconnect
  async notify(
    kind: NotifyKind,
    body: NotificationDto,
    retain: boolean,
  ): Promise<void> {
    const options = this.config.getMqtt();
    if (this.client === undefined || options === undefined) {
      return;
    }
    const topic = notifyTopic(options.topic, kind);
    const signer = this.config.getSigner();
    // A publish still waiting for its PUBACK when the client is ended at
    // shutdown never settles; nothing awaits it then
    try {
      await this.client.publishAsync(topic, signer.encode(body), {
        qos: 1,
        retain,
      });
    } catch (error) {
      this.logger.error(`MQTT notification on ${topic} failed: ${error}`);
    }
  }
}
