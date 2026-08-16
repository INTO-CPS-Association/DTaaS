import type { Execution } from 'model/backend/gitlab/measure/measurement.execution';

export interface TaskDefinition {
  name: string;
  description: string;
  executions: () => Execution[];
}
