import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import DescriptorService from '../descriptor.service.js';
import FsmService from './fsm.service.js';
import { logStay } from './requests.js';
import { condition, PeerEvents, Subscription } from './subscriptions.js';

// Raises the event of a subscription of the state machine file when its
// condition turns true in the notices of a listed peer, as a client
// raises one without a request key
@Injectable()
export default class PeerEventsService implements OnModuleInit {
  private readonly logger = new Logger(PeerEventsService.name);

  private readonly events = new PeerEvents((subscription) =>
    this.raise(subscription),
  );

  // Registers before DescriptorService loads the peers in onModuleInit,
  // whatever the order of the hooks
  constructor(
    private readonly fsm: FsmService,
    descriptor: DescriptorService,
  ) {
    const peers = descriptor.peers();
    peers.onNotice((id, kind, data) => this.events.see(id, kind, data));
    peers.onEnabled(({ id }, enabled) => this.disabled(id, enabled));
  }

  // main.ts loads the definition before init; no notice arrives before
  // this hook, as a notice needs I/O
  onModuleInit(): void {
    this.events.declare(this.fsm.declared()?.subscriptions ?? []);
  }

  // A disabled peer's records are forgotten, so that its first notice
  // after an enable counts as a change
  private disabled(id: string, enabled: boolean): void {
    if (!enabled) {
      this.events.forget(id);
    }
  }

  private raise({ peer, when, event }: Subscription): void {
    const reply = this.fsm.event(event);
    if (reply.status === 'accepted') {
      this.logger.log(
        `Raised ${event} on ${condition(when)} of peer ${peer}: entered ${reply.state}`,
      );
    }
    logStay(this.logger, reply, event);
  }
}
