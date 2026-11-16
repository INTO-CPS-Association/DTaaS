import Config from 'src/config/configuration.service';

export const configFilename = 'runner.test.yaml';
export const nonExistingCommand = 'asdfghjkl';

export const permittedCommand = (config: Config): string =>
  config.permitCommands()[0];

// The names of the commands of a history, oldest first, for the tests
// in which only the names matter
export const commandNames = (history: { name: string }[]): string[] =>
  history.map(({ name }) => name);

// A figure of a script run: a number where the platform measured it,
// null where it did not, as for a run that ended before its first sample
const figure = {
  asymmetricMatch: (value: unknown) =>
    value === null || typeof value === 'number',
  toAsymmetricMatcher: () => 'NumberOrNull',
};

// The resources of a script run, as its platform measures them
export const MEASURED = {
  cpuSeconds: figure,
  peakRssBytes: figure,
  processes: figure,
};

// The resources of a command that ran no script
export const UNMEASURED = {
  cpuSeconds: null,
  peakRssBytes: null,
  processes: null,
};
