import CMDRunner from './CMDRunner.interface.js';

type Phase = {
  name: string;
  status: string;
  task: CMDRunner;
};

type PhaseStatus = {
  name: string;
  status: string;
  logs: {
    stdout: string | undefined;
    stderr: string | undefined;
  };
};

interface DTLifeCycle {
  changePhase(name: string): Promise<[boolean, Map<string, string>]>;
  checkHistory(): Array<string>;
  checkPhase(): PhaseStatus;
}

export { Phase, PhaseStatus, DTLifeCycle };
