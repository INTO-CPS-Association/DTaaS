import type { Execution } from 'model/gitlab/measure/measurement.execution';

export interface TaskDefinition {
  name: string;
  description: string;
  executions: () => Execution[];
}
