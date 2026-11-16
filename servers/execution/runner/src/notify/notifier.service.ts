import {
  BeforeApplicationShutdown,
  Injectable,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import DescriptorService from '../descriptor.service.js';
import {
  NotificationDto,
  NotifyKind,
  offlineNotification,
} from '../dto/notify.dto.js';
import MqttService from '../mqtt/mqtt.service.js';
import WebhookClient from './webhook.client.js';

// The kinds whose last notification the broker keeps for a Manager
// that subscribes later
const RETAINED: Record<NotifyKind, boolean> = {
  state: true,
  escalation: false,
  presence: true,
};

// Sends the state document whenever it changes, the presence of the
// runner, and the notifications of other kinds, over MQTT and the
// webhook
@Injectable()
export default class Notifier
  implements OnModuleInit, OnApplicationBootstrap, BeforeApplicationShutdown
{
  // the last state document sent, without its time
  private last: string | undefined;

  private stopped = false;

  constructor(
    private readonly descriptor: DescriptorService,
    private readonly mqtt: MqttService,
    private readonly webhook: WebhookClient,
  ) {}

  // The broker keeps only the last presence notice, so the runner
  // announces itself on each connection; the webhook hears it once
  onModuleInit(): void {
    this.descriptor.onChange(() => this.sendState());
    this.mqtt.onConnect(() => this.announce());
    this.descriptor.onEscalation((data) => this.send('escalation', data));
  }

  // The presence and the state document at startup
  onApplicationBootstrap(): void {
    if (!this.stopped) {
      void this.webhook.post(this.online());
    }
    this.sendState();
  }

  // MqttService publishes the offline notice itself, as its client is
  // already disconnecting when this hook runs
  async beforeApplicationShutdown(): Promise<void> {
    this.stopped = true;
    const { id } = this.descriptor.describe();
    const time = new Date().toISOString();
    await this.webhook.sendOnce(offlineNotification(id, time));
  }

  send(kind: NotifyKind, data: unknown): void {
    if (!this.stopped) {
      const { id } = this.descriptor.describe();
      this.publish({ kind, id, time: new Date().toISOString(), data });
    }
  }

  // A document equal to the last one sent, but for its time, is not
  // sent again
  private sendState(): void {
    if (this.stopped) {
      return;
    }
    const document = this.descriptor.state();
    const content = JSON.stringify({ ...document, time: undefined });
    if (content === this.last) {
      return;
    }
    this.last = content;
    const { id, time } = document;
    this.publish({ kind: 'state', id, time, data: document });
  }

  private announce(): void {
    if (!this.stopped) {
      void this.mqtt.notify('presence', this.online(), RETAINED.presence);
    }
  }

  private online(): NotificationDto {
    const descriptor = this.descriptor.describe();
    const time = new Date().toISOString();
    const data = { online: true, descriptor };
    return { kind: 'presence', id: descriptor.id, time, data };
  }

  // Neither transport rejects
  private publish(notification: NotificationDto): void {
    const { kind } = notification;
    void this.mqtt.notify(kind, notification, RETAINED[kind]);
    void this.webhook.post(notification);
  }
}
