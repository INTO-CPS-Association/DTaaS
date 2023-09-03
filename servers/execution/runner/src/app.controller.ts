import { Controller, Get } from '@nestjs/common';
import AppService from './app.service.js';

@Controller()
export default class AppController {
  private readonly appService: AppService;

  constructor(appService: AppService) {
    this.appService = appService;
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
