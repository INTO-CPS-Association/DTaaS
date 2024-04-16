import { Injectable } from '@nestjs/common';
import { Command } from './interfaces/command.interface.js';
import { UpdatePhaseDto } from './dto/phase.dto.js';

@Injectable()
export default class Queue {
  private queue: Command[] = [];

  enqueue(phase: Command): boolean {
    this.queue.push(phase);
    return true;
  }

  phaseHistory(): Array<UpdatePhaseDto> {
    const updatePhaseDto: Array<UpdatePhaseDto> = [];
    this.queue.map((phase) => updatePhaseDto.push({ name: phase.name }));
    return updatePhaseDto;
  }

  activePhase(): Command | undefined {
    return this.queue.at(this.queue.length - 1);
  }
}
