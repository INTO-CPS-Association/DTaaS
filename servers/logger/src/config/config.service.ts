import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { IConfig } from './config.interface.js';

const DEFAULT_PORT = 4003;
const DEFAULT_LOG_FILE = 'logs/workflow-logs.jsonl';
const DEFAULT_MAX_PAYLOAD_BYTES = 64 * 1024;

@Injectable()
export default class Config implements IConfig {
  getPort(): number {
    const raw = process.env.LOGGER_PORT ?? '';
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return DEFAULT_PORT;
    }
    return parsed;
  }

  getLogFilePath(): string {
    const configuredPath = process.env.LOGGER_LOG_FILE_PATH;
    if (configuredPath !== undefined && configuredPath.trim() !== '') {
      return path.resolve(configuredPath);
    }
    return path.resolve(process.cwd(), DEFAULT_LOG_FILE);
  }

  getMaxPayloadBytes(): number {
    const raw = process.env.LOGGER_MAX_PAYLOAD_BYTES ?? '';
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return DEFAULT_MAX_PAYLOAD_BYTES;
    }
    return parsed;
  }
}
