import { Module } from '@nestjs/common';
import AppController from './app.controller';
import AppService from './app.service';
import Queue from './queue.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, Queue],
})
export default class AppModule {}
