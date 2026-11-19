export const CHANNELS = [
  'measured',
  'simulated',
  'predicted',
  'setpoint',
] as const;
export type Channel = (typeof CHANNELS)[number];

/**
 * Who asks. The token lets a policy ask GitLab with the user's own rights.
 * The owners are set instead for a Keycloak or Dex sign-in.
 */
export type Subject = {
  id: string;
  username: string;
  token: string;
  owners?: string[];
};

/** Both actions only read: live samples, or past samples. */
export type Action = 'stream' | 'range';

/**
 * One signal of one owner. Two owners may declare the same topic, so the
 * path alone does not name a signal.
 */
export type Resource = { path: string; owner: string };

/** A signal a user may read, with the twin that declares it. */
export type SignalTarget = {
  path: string;
  owner: string;
  twin: string;
  channel: Channel;
  /** The group of the owner, which names its database. */
  group?: string;
};

export type Decision =
  { allowed: true; target: SignalTarget } | { allowed: false };

/**
 * The authorisation decision behind the gateway. The GitLab policy is the
 * one in use. Another engine, such as an external policy decision point,
 * can replace it by implementing these two methods.
 */
export interface AccessPolicy {
  check(
    subject: Subject,
    action: Action,
    resource: Resource,
  ): Promise<Decision>;
  listResources(subject: Subject, action: Action): Promise<SignalTarget[]>;
}

export const ACCESS_POLICY = Symbol('ACCESS_POLICY');
