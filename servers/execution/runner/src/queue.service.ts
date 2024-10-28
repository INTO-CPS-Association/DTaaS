import { Injectable, Scope } from '@nestjs/common';
import { Command } from './interfaces/command.interface.js';
import { ExecuteCommandDto } from './dto/command.dto.js';

@Injectable({ scope: Scope.DEFAULT })
export default class Queue {
  private queue: Command[] = [];

  enqueue(command: Command): void {
    this.queue.push(command);
  }

  checkHistory(): Array<ExecuteCommandDto> {
    const updateCommandDto: Array<ExecuteCommandDto> = [];
    this.queue.map((command) => updateCommandDto.push({ name: command.name }));
    return updateCommandDto;
  }

  activeCommand(): Command | undefined {
    return this.queue.at(this.queue.length - 1);
  }
}
