import { Command } from 'commander';
import { readFileSync } from 'fs';
//import chalk from 'chalk';
import Keyv from 'keyv';
import resolveFile from './util.js';

const PACKAGE_VERSION: string = '0.3.4';
const DEFAULT_CONFIG_FILENAME = 'runner.yaml';

export function createCommand(name: string): [Command, Keyv] {
  return [new Command(name), new Keyv()];
}

export default async function CLI(
  program: Command,
  CLIOptions: Keyv,
): Promise<Keyv> {
  program
    .description('Remote code execution for humans')
    .version(PACKAGE_VERSION, '-v --version', 'package version')
    .option(
      '-c --config <string>',
      'runner config file specified in yaml format',
      DEFAULT_CONFIG_FILENAME,
    )
    .helpOption('-h --help', 'display help')
    .showHelpAfterError()
    .helpInformation();

  program.parse(process.argv);
  const options = program.opts();

  if (options.config !== undefined) {
    const configFile: string = options.config;
    const resolvedFilename: string = resolveFile(configFile.toString());
    console.log(resolvedFilename);
    try {
      readFileSync(resolvedFilename, 'utf8');
    } catch (err) {
      // eslint-disable-next-line no-console
      // console.log(chalk.bold.redBright('Config file can not be read. Exiting'));
      throw new Error('Invalid configuration');
    }
    await CLIOptions.set('configFile', resolvedFilename);
  }
  return CLIOptions;
}
