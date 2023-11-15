import { Module } from '@nestjs/common';
import AppController from './app.controller';
import LifeCycleManager from './lifecycleManager.service';
import Queue from './queue.service';
import configuration from './config/configuration';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      load: [configuration],
    }),
  ],
  controllers: [AppController],
  providers: [LifeCycleManager, Queue],
})
export default class AppModule {}
