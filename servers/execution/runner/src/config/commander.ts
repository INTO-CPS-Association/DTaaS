import { Command } from 'commander';

const program = new Command('runner');

program
  .description(
    'Runner is a remote code execution server accessible via REST API.',
  )
  .option(
    '-c --config <string>',
    'runner config file specified in yaml format',
    'runner.yaml',
  )
  .helpOption('-h --help', 'display help')
  .helpInformation();

program.parse(process.argv);
const options = program.opts();

// eslint-disable-next-line no-console
console.log(options.config);
