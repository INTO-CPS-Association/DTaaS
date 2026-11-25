import { Inject, Injectable, Logger } from '@nestjs/common';
import type { TwinRef } from '../dto/requests.js';
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

/** Who asks, for which action and, when the request names one, in which twin. */
export type AccessScope = {
  subject: Subject;
  action: Action;
  twin?: TwinRef;
};

// Only the targets of the named twin, or every target without one.
function targetsOfTwin(
  targets: SignalTarget[],
  twin: TwinRef | undefined,
): SignalTarget[] {
  if (twin === undefined) return targets;
  return targets.filter(
    (target) => target.owner === twin.owner && target.twin === twin.name,
  );
}

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

  /**
   * With a twin, only the signals that twin declares are allowed, and each
   * carries that twin's name. Without one, a signal carries the name of the
   * first twin that declares it.
   */
  async decide(
    scope: AccessScope,
    paths: readonly string[],
  ): Promise<PathDecision> {
    const readable = await this.readableOf(scope);
    paths.forEach((path) =>
      this.log(scope, path, readable.has(path) ? 'allow' : 'deny'),
    );
    return {
      allowed: paths.flatMap((path) => readable.get(path) ?? []),
      refused: paths.filter((path) => !readable.has(path)),
    };
  }

  private async readableOf(
    scope: AccessScope,
  ): Promise<Map<string, SignalTarget>> {
    try {
      const { subject, action, twin } = scope;
      const listed = await this.policy.listResources(subject, action);
      return this.firstDeclarations(subject, targetsOfTwin(listed, twin));
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `Refusing every path of ${scope.subject.username}: ${reason}`,
      );
      return new Map();
    }
  }

  // One target per path: the first declaration, unless a later one is
  // preferred.
  private firstDeclarations(
    subject: Subject,
    targets: SignalTarget[],
  ): Map<string, SignalTarget> {
    const readable = new Map<string, SignalTarget>();
    for (const target of targets) {
      const first = readable.get(target.path);
      if (first === undefined || this.prefers(subject, target, first))
        readable.set(target.path, target);
    }
    return readable;
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
  private log(scope: AccessScope, resource: string, decision: string): void {
    const { subject, action } = scope;
    this.logger.log(
      JSON.stringify({ user: subject.username, action, resource, decision }),
    );
  }
}
