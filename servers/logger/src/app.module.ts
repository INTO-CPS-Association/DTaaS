import { Module } from '@nestjs/common';
import AppController from './app.controller.js';
import LogEventValidationPipe from './log-event-validation.pipe.js';
import LogsModule from './logs/logs.module.js';

@Module({
  imports: [LogsModule],
  controllers: [AppController],
  providers: [LogEventValidationPipe],
})
export default class AppModule {}
