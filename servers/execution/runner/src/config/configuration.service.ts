import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { Injectable } from '@nestjs/common';
import Keyv from 'keyv';
import { configDefault, ConfigValues } from './config.interface.js';
import resolveFile from './util.js';

@Injectable()
export default class Config {
  private configValues: ConfigValues = configDefault;

  async loadConfig(CLIOptions: Keyv): Promise<void> {
    const configFile = await CLIOptions.get('configFile');
    if (configFile !== undefined) {
      this.configValues = yaml.load(
        readFileSync(resolveFile(configFile.toString()), 'utf8'),
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
    return resolveFile(this.configValues.location);
  }
}
