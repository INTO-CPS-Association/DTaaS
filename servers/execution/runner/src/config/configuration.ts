import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import Config from './Config.interface';

const YAML_CONFIG_FILENAME = 'runner.yaml';
const __dirname = process.cwd();

export default () =>
  yaml.load(
    readFileSync(join(__dirname, YAML_CONFIG_FILENAME), 'utf8'),
  ) as Record<string, Config>;
