import { ExecuteCommandDto } from 'src/dto/command.dto.js';

// Whether a command succeeded, and its stdout and stderr logs
type CommandResult = [boolean, Map<string, string>];

type CommandRecord = {
  id: number;
  name: string;
  status: string;
  stdout: string;
  stderr: string;
  finished: boolean;
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
  newCommand(name: string, requestKey?: string): Promise<CommandResult>;
  checkHistory(): Array<ExecuteCommandDto>;
  checkStatus(): CommandStatus;
}

export { CommandRecord, CommandResult, CommandStatus, Manager };
