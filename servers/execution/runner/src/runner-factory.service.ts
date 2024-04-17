import { Injectable } from '@nestjs/common';
import Runner from './interfaces/runner.interface.js';
import ExecaRunner from './execa-runner.js';

@Injectable()
export default class RunnerFactory {
  create(command: string): Runner {
    return new ExecaRunner(command);
  }
}
