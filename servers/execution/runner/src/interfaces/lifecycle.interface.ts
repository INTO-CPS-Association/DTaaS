import { UpdatePhaseDto } from 'src/dto/phase.dto.js';
import CMDRunner from './CMDRunner.interface.js';

type Command = {
  name: string;
  status: string;
  task: CMDRunner;
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
