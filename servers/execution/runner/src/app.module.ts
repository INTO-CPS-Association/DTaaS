import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import AppController from './app.controller';
import LifeCycleManager from './lifecycleManager.service';
import Queue from './queue.service';
import configuration from './config/configuration';

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
