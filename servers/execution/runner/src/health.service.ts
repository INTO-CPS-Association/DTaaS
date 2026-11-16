import { Injectable } from '@nestjs/common';
import Config from './config/configuration.service.js';
import {
  HealthDto,
  healthReport,
  MqttHealth,
  scriptsHealth,
} from './dto/health.dto.js';
import Queue from './queue.service.js';

// Reports whether the runner answers and its connections are up, with
// the MQTT status that the caller passes, and the account of the scripts
@Injectable()
export default class HealthService {
  constructor(
    private readonly queue: Queue,
    private readonly config: Config,
  ) {}

  check(mqtt: MqttHealth): HealthDto {
    const scripts = scriptsHealth(this.config.getScriptUser());
    return healthReport(mqtt, this.queue.mode(), scripts);
  }
}
