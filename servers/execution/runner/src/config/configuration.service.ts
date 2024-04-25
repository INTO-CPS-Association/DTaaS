import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import Keyv from 'keyv';
import { configDefault, ConfigValues } from './config.interface.js';

const YAML_CONFIG_FILENAME = 'runner.yaml';

@Injectable()
export default class Config {
  private configValues: ConfigValues = configDefault;

  private keyv = new Keyv();

  async loadConfig(): Promise<void> {
    const configFile = this.keyv.get('configFile');
    /*     console.log(typeof configFile);
    console.log(configFile); */
    if (configFile !== undefined) {
      this.configValues = yaml.load(
        /*         readFileSync(join(process.cwd(), configFile.toString()), 'utf8'), */
        readFileSync(join(process.cwd(), YAML_CONFIG_FILENAME), 'utf8'),
      ) as ConfigValues;
    }
  }

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
