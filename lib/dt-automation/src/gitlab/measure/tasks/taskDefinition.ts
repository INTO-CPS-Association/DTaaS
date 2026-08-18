import type { Execution } from 'src/gitlab/measure/measurement.execution';

export interface TaskDefinition {
  name: string;
  description: string;
  executions: () => Execution[];
}
