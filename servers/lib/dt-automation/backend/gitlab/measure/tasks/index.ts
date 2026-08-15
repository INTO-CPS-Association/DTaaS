import { TaskDefinition } from 'model/backend/gitlab/measure/tasks/taskDefinition';
import validSetupExecution from 'model/backend/gitlab/measure/tasks/validSetupExecution';
import multipleIdenticalDTs from 'model/backend/gitlab/measure/tasks/multipleIdenticalDTs';
import multipleDifferentDTs from 'model/backend/gitlab/measure/tasks/multipleDifferentDTs';
import differentRunnersSameDT from 'model/backend/gitlab/measure/tasks/differentRunnersSameDT';
import differentRunnersDifferentDTs from 'model/backend/gitlab/measure/tasks/differentRunnersDifferentDTs';

export const taskDefinitions: readonly TaskDefinition[] = [
  validSetupExecution,
  multipleIdenticalDTs,
  multipleDifferentDTs,
  differentRunnersSameDT,
  differentRunnersDifferentDTs,
];

export type { TaskDefinition } from 'model/backend/gitlab/measure/tasks/taskDefinition';
