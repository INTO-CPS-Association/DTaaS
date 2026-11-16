import type { ScriptUser } from '../scripts/separation.js';

// disconnected includes a client that is reconnecting to the broker
export type MqttHealth = 'connected' | 'disconnected' | 'disabled';

export type DatabaseMode = 'file' | 'memory';

// The account that the scripts run as; null when they run as the
// runner's own
export type ScriptsHealth = { user: string } | null;

// uptime is in whole seconds since the process started
export type HealthDto = {
  status: 'ok' | 'degraded';
  uptime: number;
  mqtt: MqttHealth;
  database: DatabaseMode;
  scripts: ScriptsHealth;
};

// The name from /etc/passwd, also when runner.yaml gave a uid
export const scriptsHealth = (user: ScriptUser | undefined): ScriptsHealth =>
  user === undefined ? null : { user: user.account.name };

export const healthReport = (
  mqtt: MqttHealth,
  database: DatabaseMode,
  scripts: ScriptsHealth,
): HealthDto => ({
  status: mqtt === 'disconnected' ? 'degraded' : 'ok',
  uptime: Math.floor(process.uptime()),
  mqtt,
  database,
  scripts,
});
