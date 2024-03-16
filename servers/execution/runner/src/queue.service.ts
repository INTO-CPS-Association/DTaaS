import { Injectable } from '@nestjs/common';
import { Phase } from './interfaces/lifecycle.interface.js';

@Injectable()
export default class Queue {
  private queue: Phase[] = [];

  enqueue(phase: Phase): boolean {
    this.queue.push(phase);
    return true;
  }

  phaseHistory(): Array<string> {
    return this.queue.map((phase) => phase.name);
  }

  activePhase(): Phase | undefined {
    return this.queue.at(this.queue.length - 1);
  }
}
