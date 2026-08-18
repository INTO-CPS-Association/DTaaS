import { TaskDefinition } from 'model/gitlab/measure/tasks/taskDefinition';
import validSetupExecution from 'model/gitlab/measure/tasks/validSetupExecution';
import multipleIdenticalDTs from 'model/gitlab/measure/tasks/multipleIdenticalDTs';
import multipleDifferentDTs from 'model/gitlab/measure/tasks/multipleDifferentDTs';
import differentRunnersSameDT from 'model/gitlab/measure/tasks/differentRunnersSameDT';
import differentRunnersDifferentDTs from 'model/gitlab/measure/tasks/differentRunnersDifferentDTs';

export const taskDefinitions: readonly TaskDefinition[] = [
  validSetupExecution,
  multipleIdenticalDTs,
  multipleDifferentDTs,
  differentRunnersSameDT,
  differentRunnersDifferentDTs,
];

export type { TaskDefinition } from 'model/gitlab/measure/tasks/taskDefinition';
