import CMDRunner from './CMDRunner.interface';

type Phase = {
  name: string;
  status: string;
  task: CMDRunner;
};

interface DTLifeCycle {
  changePhase(name: string): Promise<[boolean, Map<string, string>]>;
  checkHistory(): Array<string>;
  checkPhase(): Phase | undefined;
}

export { Phase, DTLifeCycle };
