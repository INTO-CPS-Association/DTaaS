export const CHANNELS = [
  'measured',
  'simulated',
  'predicted',
  'setpoint',
] as const;
export type Channel = (typeof CHANNELS)[number];

/** Who asks. The token lets a policy ask GitLab with the user's own rights. */
export type Subject = { id: number; username: string; token: string };

/** Both actions only read: live samples, or past samples. */
export type Action = 'stream' | 'range';

export type Resource = { path: string };

export type InfluxSource = {
  org: string;
  bucket: string;
  measurement?: string;
};

/** A signal a user may read, with where to read it. */
export type SignalTarget = {
  path: string;
  owner: string;
  twin: string;
  channel: Channel;
  vhost: string;
  influx?: InfluxSource;
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
