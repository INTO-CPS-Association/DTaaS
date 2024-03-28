import { Injectable } from '@nestjs/common';
import { Phase } from './interfaces/lifecycle.interface.js';
import { UpdatePhaseDto } from './dto/phase.dto.js';

@Injectable()
export default class Queue {
  private queue: Phase[] = [];

  enqueue(phase: Phase): boolean {
    this.queue.push(phase);
    return true;
  }

  phaseHistory(): Array<UpdatePhaseDto> {
    const updatePhaseDto: Array<UpdatePhaseDto>:
    return this.queue.map((phase) => updatePhaseDto.push({ "name": phase.name }));
  }

  activePhase(): Phase | undefined {
    return this.queue.at(this.queue.length - 1);
  }
}
