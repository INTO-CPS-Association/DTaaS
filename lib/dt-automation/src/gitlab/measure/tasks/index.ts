import { TaskDefinition } from 'src/gitlab/measure/tasks/taskDefinition';
import validSetupExecution from 'src/gitlab/measure/tasks/validSetupExecution';
import multipleIdenticalDTs from 'src/gitlab/measure/tasks/multipleIdenticalDTs';
import multipleDifferentDTs from 'src/gitlab/measure/tasks/multipleDifferentDTs';
import differentRunnersSameDT from 'src/gitlab/measure/tasks/differentRunnersSameDT';
import differentRunnersDifferentDTs from 'src/gitlab/measure/tasks/differentRunnersDifferentDTs';

export const taskDefinitions: readonly TaskDefinition[] = [
  validSetupExecution,
  multipleIdenticalDTs,
  multipleDifferentDTs,
  differentRunnersSameDT,
  differentRunnersDifferentDTs,
];

export type { TaskDefinition } from 'src/gitlab/measure/tasks/taskDefinition';
