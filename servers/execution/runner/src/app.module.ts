import { connect } from 'mqtt';
import { Module } from '@nestjs/common';
import RunnerFactory from './runner-factory.service.js';
import AppController from './app.controller.js';
import ExecaManager from './execa-manager.service.js';
import Queue from './queue.service.js';
import Config from './config/configuration.service.js';
import MqttRequestHandler from './mqtt/mqtt-request.handler.js';
import MqttService, { MQTT_CONNECT } from './mqtt/mqtt.service.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    ExecaManager,
    Queue,
    RunnerFactory,
    Config,
    MqttRequestHandler,
    MqttService,
    { provide: MQTT_CONNECT, useValue: connect },
  ],
})
export default class AppModule {}
