import { Injectable, Logger } from '@nestjs/common';
import DescriptorService from '../descriptor.service.js';
import { notifyTopic } from '../mqtt/mqtt.config.js';
import MqttService from '../mqtt/mqtt.service.js';
import readNotice from './peer-notice.js';
import Peers, { NOTICE_KINDS, NoticeKind } from './peers.js';
import { PeerConfig } from './peers.config.js';

// Follows the presence and state notices of each enabled peer that has
// a topic, on the runner's own broker, and hands them to Peers
@Injectable()
export default class PeerWatch {
  private readonly logger = new Logger(PeerWatch.name);

  private readonly peers: Peers;

  // Registers before DescriptorService loads the peers in onModuleInit,
  // whatever the order of the hooks
  constructor(
    descriptor: DescriptorService,
    private readonly mqtt: MqttService,
  ) {
    this.peers = descriptor.peers();
    this.peers.onEnabled((peer, enabled) => this.watch(peer, enabled));
  }

  // A peer without a topic is listed, but not followed
  private watch(peer: PeerConfig, enabled: boolean): void {
    const { topic } = peer;
    if (topic === undefined) {
      return;
    }
    NOTICE_KINDS.forEach((kind) =>
      enabled
        ? this.mqtt.follow(notifyTopic(topic, kind), (payload) =>
            this.receive(peer, kind, payload),
          )
        : this.mqtt.unfollow(notifyTopic(topic, kind)),
    );
  }

  private receive(peer: PeerConfig, kind: NoticeKind, payload: Buffer) {
    const reading = readNotice(peer, kind, payload);
    if ('dropped' in reading) {
      this.logger.warn(
        `Dropped a ${kind} notice of peer ${peer.id}: ${reading.dropped}`,
      );
      return;
    }
    this.peers.observe(peer.id, kind, reading.data);
  }
}
