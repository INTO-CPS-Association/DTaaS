import Config from 'src/config/configuration.service';

export const configFilename = 'runner.test.yaml';
export const nonExistingCommand = 'asdfghjkl';

export const permittedCommand = (config: Config): string =>
  config.permitCommands()[0];
