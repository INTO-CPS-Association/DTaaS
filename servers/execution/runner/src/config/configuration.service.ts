import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import { ConfigValues, PermitCommand } from './Config.interface';

const YAML_CONFIG_FILENAME = 'runner.yaml';

export default class Config {
  // eslint-disable-next-line no-useless-constructor
  constructor(private configValues: ConfigValues) {} // eslint-disable-line no-empty-function

  permitCommands(): Array<PermitCommand> {
    return this.configValues.commands;
  }

  getPort(): number {
    return this.configValues.port;
  }
}

export function readConfig(filename: string): ConfigValues {
  return yaml.load(
    readFileSync(join(process.cwd(), filename), 'utf8'),
  ) as ConfigValues;
}

export function readConfigDefault(): ConfigValues {
  return yaml.load(
    readFileSync(join(process.cwd(), YAML_CONFIG_FILENAME), 'utf8'),
  ) as ConfigValues;
}
