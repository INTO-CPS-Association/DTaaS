import { measurementConfig as MeasurementConfig } from 'model/backend/gitlab/measure/measurement.execution';
import { TaskDefinition } from './taskDefinition';

const differentRunnersDifferentDTs: TaskDefinition = {
  name: 'Different Runners different Digital Twins',
  description:
    'Running the primary and secondary Digital Twins with 2 runners.',
  executions: () => [
    {
      dtName: MeasurementConfig.primaryDTName,
      config: { 'Runner tag': MeasurementConfig.primaryRunnerTag },
    },
    {
      dtName: MeasurementConfig.secondaryDTName,
      config: { 'Runner tag': MeasurementConfig.secondaryRunnerTag },
    },
  ],
};

export default differentRunnersDifferentDTs;
