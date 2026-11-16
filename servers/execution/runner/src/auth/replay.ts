import { SKEW } from './claims.js';
import { refuse } from './refusal.js';

// The jti of the accepted tokens, each until its token expires with
// the skew, after which the token is refused for its time anyway. In
// memory: a restart forgets them, and a token lives 90 s at most.
export default class Replays {
  private readonly seen = new Map<string, number>();

  // exp and now in seconds
  remember(jti: string, exp: number, now: number): void {
    this.prune(now);
    if (this.seen.has(jti)) {
      throw refuse('replayed');
    }
    this.seen.set(jti, exp + SKEW);
  }

  size(): number {
    return this.seen.size;
  }

  private prune(now: number): void {
    this.seen.forEach((until, jti) => {
      if (until < now) {
        this.seen.delete(jti);
      }
    });
  }
}
