import { Command } from 'commander';
import Keyv from 'keyv';

export default async function CLI(): Promise<Keyv> {
  const program = new Command('runner');
  const keyv = new Keyv();

  program
    .description('Remote code execution for humans')
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
    const configFile: string = options.config;
    await keyv.set('configFile', configFile);
    // eslint-disable-next-line no-console
    console.log(await keyv.get('configFile'));
  }
  return keyv;
}
