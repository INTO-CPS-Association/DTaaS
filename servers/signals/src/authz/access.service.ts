import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ACCESS_POLICY,
  type AccessPolicy,
  type Action,
  type SignalTarget,
  type Subject,
} from './policy.js';

export type PathDecision = {
  allowed: SignalTarget[];
  refused: string[];
};

/**
 * Turns the policy's answer into a decision per requested path, and logs
 * each one. Deny by default: a path the policy does not list is refused, and
 * any error while asking refuses every path.
 */
@Injectable()
export default class AccessService {
  private readonly logger = new Logger(AccessService.name);

  // eslint-disable-next-line no-useless-constructor
  constructor(@Inject(ACCESS_POLICY) private readonly policy: AccessPolicy) {} // eslint-disable-line no-empty-function

  async decide(
    subject: Subject,
    action: Action,
    paths: readonly string[],
  ): Promise<PathDecision> {
    const readable = await this.readableOf(subject, action);
    const decision: PathDecision = { allowed: [], refused: [] };
    for (const path of paths) {
      const target = readable.get(path);
      if (target === undefined) decision.refused.push(path);
      else decision.allowed.push(target);
      this.log(subject, action, path, target === undefined ? 'deny' : 'allow');
    }
    return decision;
  }

  private async readableOf(
    subject: Subject,
    action: Action,
  ): Promise<Map<string, SignalTarget>> {
    try {
      const targets = await this.policy.listResources(subject, action);
      const readable = new Map<string, SignalTarget>();
      targets.forEach((target) => {
        const first = readable.get(target.path);
        if (first === undefined) readable.set(target.path, target);
        else if (this.prefers(subject, target, first)) {
          readable.set(target.path, target);
        }
      });
      return readable;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Refusing every path of ${subject.username}: ${reason}`);
      return new Map();
    }
  }

  // A request names a path, not an owner. When two owners the user can read
  // declare the same topic, the user's own twin wins, so a project shared
  // with the user cannot take over a topic of the user's own. Between twins
  // of one owner, or of two other owners, the first declaration wins.
  private prefers(
    subject: Subject,
    candidate: SignalTarget,
    first: SignalTarget,
  ): boolean {
    if (candidate.owner === first.owner) return false;
    this.logger.warn(
      `${first.owner} and ${candidate.owner} both declare ${candidate.path}`,
    );
    return (
      candidate.owner === subject.username && first.owner !== subject.username
    );
  }

  // One line per decision, with no token: who, what, which signal, outcome.
  private log(
    subject: Subject,
    action: Action,
    resource: string,
    decision: string,
  ): void {
    this.logger.log(
      JSON.stringify({ user: subject.username, action, resource, decision }),
    );
  }
}
