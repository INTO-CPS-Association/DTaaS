import { UpdatePhaseDto } from 'src/dto/phase.dto.js';
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
  checkHistory(): Array<UpdatePhaseDto>;
  checkPhase(): PhaseStatus;
}

export { Phase, PhaseStatus, DTLifeCycle };
