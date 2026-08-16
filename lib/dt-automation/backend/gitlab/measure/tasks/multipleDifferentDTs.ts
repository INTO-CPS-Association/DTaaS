import { measurementConfig as MeasurementConfig } from 'model/backend/gitlab/measure/measurement.execution';
import { TaskDefinition } from './taskDefinition';

const multipleDifferentDTs: TaskDefinition = {
  name: 'Multiple different Digital Twins Simultaneously',
  description: 'Running the primary and secondary Digital Twins at once.',
  executions: () => [
    { dtName: MeasurementConfig.primaryDTName, config: {} },
    { dtName: MeasurementConfig.secondaryDTName, config: {} },
  ],
};

export default multipleDifferentDTs;
