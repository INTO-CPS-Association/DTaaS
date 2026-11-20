import { z } from 'zod';
import type Config from '../config/configuration.service.js';
import type { NoticeKind } from '../peers/peers.js';
import { nameSchema } from './name.js';

// What a definition is checked against: the commands that runner.yaml
// permits, the ids of the peers it lists, and whether the scripts run
// as a second account
export type Known = {
  commands: string[];
  peers: string[];
  separated?: boolean;
};

export const known = (config: Config): Known => ({
  commands: config.permitCommands(),
  peers: config.getPeers().map(({ id }) => id),
  separated: config.getScriptUser() !== undefined,
});

// Exactly one condition on the latest notice of a peer
const whenSchema = z.union(
  [
    z.strictObject({ state: nameSchema }),
    z.strictObject({ online: z.boolean() }),
  ],
  { error: 'must hold exactly one of state: <name> and online: <boolean>' },
);

export type When = z.infer<typeof whenSchema>;

const subscriptionSchema = z.strictObject({
  peer: nameSchema,
  when: whenSchema,
  event: nameSchema,
});

export type Subscription = z.infer<typeof subscriptionSchema>;

// The subscriptions section of the state machine file
export const subscriptionsSchema = z.array(subscriptionSchema).default([]);

// A condition as the error messages and the log name it
export function condition(when: When): string {
  if ('state' in when) {
    return `state ${when.state}`;
  }
  return `online ${when.online}`;
}

const keyOf = ({ peer, when, event }: Subscription): string =>
  JSON.stringify([peer, condition(when), event]);

const label = (subscription: Subscription): string =>
  `subscription to peer ${subscription.peer}`;

type Section = { events: ReadonlySet<string>; subscriptions: Subscription[] };

// The problems of the subscriptions that their schema can not see
export function subscriptionProblems(
  { events, subscriptions }: Section,
  peers: string[],
): string[] {
  const keys = subscriptions.map(keyOf);
  const unlisted = subscriptions
    .filter(({ peer }) => !peers.includes(peer))
    .map(({ peer }) => `subscription to unlisted peer ${peer}`);
  const undeclared = subscriptions
    .filter(({ event }) => !events.has(event))
    .map((each) => `${label(each)} raises undeclared event ${each.event}`);
  const repeated = subscriptions
    .filter((each, index) => keys.indexOf(keyOf(each)) < index)
    .map(
      (each) =>
        `${label(each)} repeats ${each.event} on ${condition(each.when)}`,
    );
  return [...unlisted, ...undeclared, ...repeated];
}

// The state of a state document, if it has a machine
const documentSchema = z.object({ machine: z.object({ state: z.string() }) });

// The online of a presence notice, if it has one
const presenceSchema = z.object({ online: z.boolean() });

function stateHolds(state: string, kind: NoticeKind, data: unknown) {
  if (kind !== 'state') {
    return undefined;
  }
  return documentSchema.safeParse(data).data?.machine.state === state;
}

function onlineHolds(online: boolean, kind: NoticeKind, data: unknown) {
  if (kind !== 'presence') {
    return undefined;
  }
  return presenceSchema.safeParse(data).data?.online === online;
}

// Whether the condition holds in the notice, or undefined for a notice
// of the other kind, which says nothing about it. The null data of an
// empty payload holds nothing.
export function holds(
  when: When,
  kind: NoticeKind,
  data: unknown,
): boolean | undefined {
  if ('state' in when) {
    return stateHolds(when.state, kind, data);
  }
  return onlineHolds(when.online, kind, data);
}

export type Raise = (subscription: Subscription) => void;

// Raises the event of a subscription when its condition turns from not
// holding, or unknown, to holding, in the notices of its peer
export class PeerEvents {
  private subscriptions: Subscription[] = [];

  // Whether the condition of each subscription, by index, held in the
  // last notice of its kind; a missing index is unknown
  private readonly held = new Map<number, boolean>();

  constructor(private readonly raise: Raise) {}

  // A new load starts from unknown
  declare(subscriptions: Subscription[]): void {
    this.subscriptions = subscriptions;
    this.held.clear();
  }

  // Raises in file order, each against the state the previous one left
  see(peer: string, kind: NoticeKind, data: unknown): void {
    this.indexesOf(peer).forEach((index) => this.update(index, kind, data));
  }

  // The next notice of the peer counts as its first
  forget(peer: string): void {
    this.indexesOf(peer).forEach((index) => this.held.delete(index));
  }

  private indexesOf(peer: string): number[] {
    return this.subscriptions.flatMap((each, index) =>
      each.peer === peer ? [index] : [],
    );
  }

  private update(index: number, kind: NoticeKind, data: unknown): void {
    const subscription = this.subscriptions[index];
    const now = holds(subscription.when, kind, data);
    if (now === undefined) {
      return;
    }
    const before = this.held.get(index);
    this.held.set(index, now);
    if (now && before !== true) {
      this.raise(subscription);
    }
  }
}
