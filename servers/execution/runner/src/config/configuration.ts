import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import Config from './Config.interface';

const YAML_CONFIG_FILENAME = 'runner.yaml';

export default () =>
  yaml.load(
    readFileSync(join(process.cwd(), YAML_CONFIG_FILENAME), 'utf8'),
  ) as Record<string, Config>;
