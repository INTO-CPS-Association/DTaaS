import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

interface HealthResponse {
  status: 'ok';
}

@Controller()
export default class AppController {
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health(): HealthResponse {
    return { status: 'ok' };
  }
}
