import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { configDefault, ConfigValues } from './config.interface.js';
import Keyv from 'keyv';

/* const YAML_CONFIG_FILENAME = 'runner.yaml'; */

@Injectable()
export default class Config {
  private configValues: ConfigValues = configDefault;
  // eslint-disable-next-line no-useless-constructor
  constructor() {
    const keyv = new Keyv();
    const configFile = keyv.get('configFile');
    console.log(typeof configFile);
    console.log(configFile);
    if (configFile !== undefined) {
      this.configValues = yaml.load(
        readFileSync(join(process.cwd(), configFile.toString()), 'utf8'),
      ) as ConfigValues;
    }
  } // eslint-disable-line no-empty-function

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

/* export function readConfigDefault(): ConfigValues {
  return yaml.load(
    readFileSync(join(process.cwd(), YAML_CONFIG_FILENAME), 'utf8'),
  ) as ConfigValues;
}
 */