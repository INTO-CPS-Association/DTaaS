import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import Config from '../config/config.service.js';

/** How many streams each user has open, bounded by max-streams-per-user. */
@Injectable()
export default class StreamSlots {
  private readonly counts = new Map<number, number>();

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly config: Config) {}

  /** Take a slot, or refuse with 429. The function returned gives it back. */
  acquire(userId: number): () => void {
    const open = this.counts.get(userId) ?? 0;
    if (open >= this.config.get('max-streams-per-user')) {
      throw new HttpException('Too many streams', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.counts.set(userId, open + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const left = (this.counts.get(userId) ?? 1) - 1;
      if (left > 0) this.counts.set(userId, left);
      else this.counts.delete(userId);
    };
  }

  openFor(userId: number): number {
    return this.counts.get(userId) ?? 0;
  }
}
