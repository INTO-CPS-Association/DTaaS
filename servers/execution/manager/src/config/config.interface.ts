import type { GitlabSettings } from './gitlab-settings.js';
import type { MqttSettings } from './mqtt-settings.js';

export interface IConfig {
  loadConfig(configPath?: string): void;
  getHostname(): string;
  getPort(): number;
  getRoutePrefix(): string;
  getGitlab(): GitlabSettings;
  getMqtt(): MqttSettings;
}
