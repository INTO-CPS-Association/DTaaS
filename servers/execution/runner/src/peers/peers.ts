import { PeerDto, PeersBody, PeersDto } from '../dto/peers.dto.js';
import { PeerConfig } from './peers.config.js';

// The notify topics of a peer that the runner follows
export type NoticeKind = 'presence' | 'state';

export const NOTICE_KINDS: readonly NoticeKind[] = ['presence', 'state'];

// The data of a presence notice; an offline notice has no descriptor
export type Presence = { online: boolean; descriptor?: unknown };

// Where the switches of PUT /peers are kept, as Queue keeps them
export type PeerStore = {
  setPeers(changes: ReadonlyMap<string, boolean>): void;
  peerSwitches(): ReadonlyMap<string, boolean>;
};

export type EnabledListener = (peer: PeerConfig, enabled: boolean) => void;

export type NoticeListener = (
  id: string,
  kind: NoticeKind,
  data: unknown,
) => void;

type Received = Pick<PeerDto, 'online' | 'descriptor' | 'state'>;

const UNKNOWN: Received = { online: null, descriptor: null, state: null };

// An offline notice keeps the descriptor of the last online one; an
// empty payload, null here, clears both
function presencePart(presence: Presence | null, last: Received) {
  if (presence === null) {
    return { online: null, descriptor: null };
  }
  const { online, descriptor = null } = presence;
  return { online, descriptor: online ? descriptor : last.descriptor };
}

const part = (kind: NoticeKind, data: unknown, last: Received) =>
  kind === 'state'
    ? { state: data }
    : presencePart(data as Presence | null, last);

// The peers of runner.yaml, which of them are enabled, and what their
// notices said. Only the operator lists peers; PUT /peers enables and
// disables them.
export default class Peers {
  private list: PeerConfig[] = [];

  private store: PeerStore | undefined;

  private enabled = new Map<string, boolean>();

  private readonly received = new Map<string, Received>();

  private readonly listeners: EnabledListener[] = [];

  private readonly noticeListeners: NoticeListener[] = [];

  // A stored switch overrides the enabled of the file; each enabled
  // peer is signalled
  load(list: PeerConfig[], store: PeerStore): void {
    const stored = store.peerSwitches();
    this.list = list;
    this.store = store;
    this.enabled = new Map(
      list.map(({ id, enabled }) => [id, stored.get(id) ?? enabled]),
    );
    this.received.clear();
    list
      .filter(({ id }) => this.isEnabled(id))
      .forEach((peer) => this.signal(peer, true));
  }

  // Signals a peer that is enabled or disabled
  onEnabled(listener: EnabledListener): void {
    this.listeners.push(listener);
  }

  // Signals each notice that observe stored, after it stored it
  onNotice(listener: NoticeListener): void {
    this.noticeListeners.push(listener);
  }

  // In the order of runner.yaml
  enabledIds(): string[] {
    return this.list.filter(({ id }) => this.isEnabled(id)).map(({ id }) => id);
  }

  document(): PeersDto {
    return Object.fromEntries(
      this.list.map((peer) => [peer.id, this.entry(peer)]),
    );
  }

  // Checks the whole body before it stores and applies the changes, and
  // returns every problem found instead
  set(body: PeersBody): string[] {
    const problems = Object.entries(body).flatMap(([id, value]) =>
      this.problem(id, value),
    );
    if (problems.length > 0) {
      return problems;
    }
    const changed = this.list.filter(
      ({ id }) => Object.hasOwn(body, id) && body[id] !== this.isEnabled(id),
    );
    this.store?.setPeers(
      new Map(changed.map(({ id }) => [id, body[id] === true])),
    );
    changed.forEach((peer) => this.apply(peer, body[peer.id] === true));
    return [];
  }

  // Remembers the data of a notice of an enabled peer, null for an
  // empty payload; a notice that arrives after a disable is ignored
  observe(id: string, kind: NoticeKind, data: unknown): void {
    if (!this.isEnabled(id)) {
      return;
    }
    const last = this.received.get(id) ?? UNKNOWN;
    this.received.set(id, { ...last, ...part(kind, data, last) });
    this.noticeListeners.forEach((listener) => listener(id, kind, data));
  }

  private isEnabled(id: string): boolean {
    return this.enabled.get(id) === true;
  }

  private problem(id: string, value: unknown): string[] {
    if (!this.enabled.has(id)) {
      return [`unknown peer ${id}`];
    }
    return typeof value === 'boolean' ? [] : [`peer ${id} takes a boolean`];
  }

  private apply(peer: PeerConfig, enabled: boolean): void {
    this.enabled.set(peer.id, enabled);
    this.received.delete(peer.id);
    this.signal(peer, enabled);
  }

  private signal(peer: PeerConfig, enabled: boolean): void {
    this.listeners.forEach((listener) => listener(peer, enabled));
  }

  private entry({ id, topic, url, attributes }: PeerConfig): PeerDto {
    return {
      topic: topic ?? null,
      url: url ?? null,
      attributes,
      enabled: this.isEnabled(id),
      ...(this.received.get(id) ?? UNKNOWN),
    };
  }
}
