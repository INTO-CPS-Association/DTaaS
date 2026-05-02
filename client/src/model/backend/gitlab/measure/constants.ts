const DEFAULT_MEASUREMENT = {
  trials: 3,
  secondaryRunnerTag: 'windows',
  primaryDTName: 'hello-world',
  secondaryDTName: 'mass-spring-damper',
  disabledTaskNames: [] as string[],
};

export const BETWEEN_TRIAL_DELAY = 750;

export default DEFAULT_MEASUREMENT;
