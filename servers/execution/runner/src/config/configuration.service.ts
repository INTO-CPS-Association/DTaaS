import { readFileSync } from 'fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { Injectable } from '@nestjs/common';
import Keyv from 'keyv';
import { z } from 'zod';
import {
  configDefault,
  ConfigValues,
  DEFAULT_STOP_GRACE,
} from './config.interface.js';
import { Attributes } from './attributes.js';
import { configSchema } from './config.schema.js';
import resolveFile from './util.js';
import Access from '../auth/access.js';
import { AuthConfig } from '../auth/auth.config.js';
import Signer from '../auth/signer.js';
import { hasOwnProto } from '../fsm/definition.js';
import { MqttConfig } from '../mqtt/mqtt.config.js';
import { NotifyConfig } from '../notify/notify.config.js';
import { PeerConfig } from '../peers/peers.config.js';
import { ScriptsConfig } from '../scripts/scripts.config.js';
import { checkSeparation, ScriptUser } from '../scripts/separation.js';

const invalid = (file: string, problems: string): Error =>
  new Error(`Invalid configuration in ${file}:\n${problems}`);

// js-yaml throws on an empty file and on a syntax error, neither of
// which names the file
function readConfig(file: string): unknown {
  try {
    return yaml.load(readFileSync(file, 'utf8'));
  } catch (error) {
    throw invalid(file, String(error));
  }
}

// The value of a key of a parsed YAML mapping
const field = (value: unknown, key: string): unknown =>
  (value as Record<string, unknown> | null | undefined)?.[key];

// zod skips a __proto__ key of a record without an error, so look for
// one among the attributes of the runner and of each peer first
function protoProblem(content: unknown): string | undefined {
  const peers = field(content, 'peers');
  const attributes = [
    ['attributes', field(content, 'attributes')],
    ...(Array.isArray(peers) ? peers : []).map((peer, index) => [
      `peers.${index}.attributes`,
      field(peer, 'attributes'),
    ]),
  ];
  const found = attributes.find(([, value]) => hasOwnProto(value));
  return found && `✖ __proto__ is not a valid name\n  → at ${found[0]}`;
}

function parseConfig(content: unknown, file: string): ConfigValues {
  const problem = protoProblem(content);
  if (problem !== undefined) {
    throw invalid(file, problem);
  }
  const result = configSchema.safeParse(content);
  if (!result.success) {
    throw invalid(file, z.prettifyError(result.error));
  }
  return result.data;
}

// The signing key, like stateMachine, may be absolute, as it often
// lives in a mounted secret directory
const resolveAuth = (dir: string, auth: AuthConfig | undefined) =>
  auth?.key === undefined
    ? auth
    : { ...auth, key: path.resolve(dir, auth.key) };

// The run directory often lives under /var/lib, so it may be absolute
const resolveScripts = (dir: string, scripts: ScriptsConfig | undefined) =>
  scripts && {
    ...scripts,
    runDirectory: path.resolve(dir, scripts.runDirectory),
  };

// location and database keep path.join, so an absolute path is still
// taken as relative to dir; stateMachine, auth.key and
// scripts.runDirectory may be absolute
const resolvePaths = (dir: string, values: ConfigValues): ConfigValues => ({
  ...values,
  location: path.join(dir, values.location),
  database:
    values.database === undefined ? undefined : path.join(dir, values.database),
  stateMachine:
    values.stateMachine === undefined
      ? undefined
      : path.resolve(dir, values.stateMachine),
  auth: resolveAuth(dir, values.auth),
  scripts: resolveScripts(dir, values.scripts),
});

@Injectable()
export default class Config {
  private configValues: ConfigValues = configDefault;

  private accessControl: Access | undefined;

  private signer = new Signer(undefined, configDefault.id);

  private scriptUser: ScriptUser | undefined;

  async loadConfig(CLIOptions: Keyv): Promise<void> {
    const configFile = await CLIOptions.get('configFile');
    const file = resolveFile(configFile.toString());
    const values = parseConfig(readConfig(file), file);
    this.configValues = resolvePaths(path.dirname(file), values);
    const { principals, key } = this.configValues.auth ?? {};
    this.accessControl = principals && new Access(principals, values.id);
    this.signer = Signer.load(key, values.id);
    this.scriptUser = checkSeparation(file, this.configValues);
  }

  // Verifies the callers; without principals every route is open
  access(): Access | undefined {
    return this.accessControl;
  }

  // Encodes the notifications and MQTT responses; without a key they
  // are plain JSON
  getSigner(): Signer {
    return this.signer;
  }

  getId(): string {
    return this.configValues.id;
  }

  getAttributes(): Attributes {
    return this.configValues.attributes;
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

  getStateMachine(): string | undefined {
    return this.configValues.stateMachine;
  }

  getDatabase(): string | undefined {
    return this.configValues.database;
  }

  getMqtt(): MqttConfig | undefined {
    return this.configValues.mqtt;
  }

  getStopGrace(): number {
    return this.configValues.stopGrace ?? DEFAULT_STOP_GRACE;
  }

  getNotify(): NotifyConfig | undefined {
    return this.configValues.notify;
  }

  // The peers in the order of runner.yaml, with the enabled of the file
  getPeers(): PeerConfig[] {
    return this.configValues.peers;
  }

  // The account and the directory of the scripts; undefined without
  // scripts.user, when the scripts run as the runner's account
  getScriptUser(): ScriptUser | undefined {
    return this.scriptUser;
  }
}
