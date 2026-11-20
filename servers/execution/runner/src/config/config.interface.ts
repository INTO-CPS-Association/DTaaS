import { z } from 'zod';
import { configSchema } from './config.schema.js';

// unused type
export type PermitCommand = {
  name: string;
  executable: string;
};

// The configuration once loaded, with location, database,
// stateMachine, auth.key and scripts.runDirectory resolved against the
// directory of the config file
export type ConfigValues = z.infer<typeof configSchema>;

// milliseconds from SIGTERM to SIGKILL when a script is stopped,
// without stopGrace in runner.yaml
export const DEFAULT_STOP_GRACE = 5000;

// Only seen before loadConfig, which main.ts calls before the server
// listens
export const configDefault: ConfigValues = {
  id: 'runner',
  attributes: {},
  port: 5000,
  location: 'script',
  commands: [],
  peers: [],
};
