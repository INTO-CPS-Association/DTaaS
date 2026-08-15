import { measurementConfig as MeasurementConfig } from 'model/backend/gitlab/measure/measurement.execution';
import { TaskDefinition } from './taskDefinition';

const multipleIdenticalDTs: TaskDefinition = {
  name: 'Multiple Identical Digital Twins Simultaneously',
  description: 'Running the primary Digital Twin twice at once.',
  executions: () => [
    { dtName: MeasurementConfig.primaryDTName, config: {} },
    { dtName: MeasurementConfig.primaryDTName, config: {} },
  ],
};

export default multipleIdenticalDTs;
