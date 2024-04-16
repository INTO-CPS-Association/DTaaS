import { UpdatePhaseDto } from 'src/dto/phase.dto.js';
import Runner from './runner.interface.js';

type Command = {
  name: string;
  status: string;
  task: Runner;
};

type CommandStatus = {
  name: string;
  status: string;
  logs: {
    stdout: string | undefined;
    stderr: string | undefined;
  };
};

interface Manager {
  changePhase(name: string): Promise<[boolean, Map<string, string>]>;
  checkHistory(): Array<UpdatePhaseDto>;
  checkPhase(): CommandStatus;
}

export { Command, CommandStatus, Manager };
