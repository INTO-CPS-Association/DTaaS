import { Injectable } from '@nestjs/common';
import { Command } from './interfaces/command.interface.js';
import { ExecuteCommandDto } from './dto/command.dto.js';

@Injectable()
export default class Queue {
  private queue: Command[] = [];

  enqueue(command: Command): boolean {
    this.queue.push(command);
    return true;
  }

  phaseHistory(): Array<ExecuteCommandDto> {
    const updateCommandDto: Array<ExecuteCommandDto> = [];
    this.queue.map((command) => updateCommandDto.push({ name: command.name }));
    return updateCommandDto;
  }

  activePhase(): Command | undefined {
    return this.queue.at(this.queue.length - 1);
  }
}
