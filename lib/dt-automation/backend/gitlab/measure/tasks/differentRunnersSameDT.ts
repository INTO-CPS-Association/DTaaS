import { measurementConfig as MeasurementConfig } from 'model/backend/gitlab/measure/measurement.execution';
import { TaskDefinition } from './taskDefinition';

const differentRunnersSameDT: TaskDefinition = {
  name: 'Different Runners same Digital Twin',
  description: 'Running the primary Digital Twin twice with 2 runners.',
  executions: () => [
    {
      dtName: MeasurementConfig.primaryDTName,
      config: { 'Runner tag': MeasurementConfig.primaryRunnerTag },
    },
    {
      dtName: MeasurementConfig.primaryDTName,
      config: { 'Runner tag': MeasurementConfig.secondaryRunnerTag },
    },
  ],
};

export default differentRunnersSameDT;
