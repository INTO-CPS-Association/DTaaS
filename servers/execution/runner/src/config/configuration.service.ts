import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigValues } from './Config.interface';

const YAML_CONFIG_FILENAME = 'runner.yaml';

@Injectable()
export default class Config {
  private configValues: ConfigValues = {
    port: 5000,
    location: 'script',
    commands: ['create'],
  };
  // eslint-disable-next-line no-useless-constructor
  // constructor(private configValues: ConfigValues) {} // eslint-disable-line no-empty-function

  permitCommands(): Array<string> {
    return this.configValues.commands;
  }

  getPort(): number {
    return this.configValues.port;
  }

  getLocation(): string {
    return this.configValues.location;
  }
}

export function readConfigDefault(): ConfigValues {
  return yaml.load(
    readFileSync(join(process.cwd(), YAML_CONFIG_FILENAME), 'utf8'),
  ) as ConfigValues;
}
