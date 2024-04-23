import { Command } from 'commander';
import Keyv from 'keyv';
import { ConfigValues } from './Config.interface';

const program = new Command('runner');
const keyv = new Keyv();

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

if (options.config !== undefined) {
  const config: ConfigValues = options.config;
  await keyv.set('configValues', config);
  console.log(await keyv.get('configValues'));
}
