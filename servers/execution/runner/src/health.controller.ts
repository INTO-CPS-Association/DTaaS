import { Controller, Get } from '@nestjs/common';
import { HealthDto } from './dto/health.dto.js';
import HealthService from './health.service.js';
import MqttService from './mqtt/mqtt.service.js';
import { AccessRoute } from './auth/roles.js';

@Controller('health')
export default class HealthController {
  constructor(
    private readonly health: HealthService,
    private readonly mqtt: MqttService,
  ) {}

  // 200 also when degraded, as this is a liveness check
  @Get()
  @AccessRoute('health')
  check(): HealthDto {
    return this.health.check(this.mqtt.status());
  }
}
