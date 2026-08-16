import { measurementConfig as MeasurementConfig } from 'model/backend/gitlab/measure/measurement.execution';
import { TaskDefinition } from './taskDefinition';

const validSetupExecution: TaskDefinition = {
  name: 'Valid Setup Digital Twin Execution',
  description: 'Running the primary Digital Twin with current setup.',
  executions: () => [{ dtName: MeasurementConfig.primaryDTName, config: {} }],
};

export default validSetupExecution;
