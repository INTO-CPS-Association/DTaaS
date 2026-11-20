import { connect } from 'mqtt';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import RunnerFactory from './runner-factory.service.js';
import AppController from './app.controller.js';
import ExecaManager from './execa-manager.service.js';
import Queue from './queue.service.js';
import Config from './config/configuration.service.js';
import DescriptorService from './descriptor.service.js';
import MqttRequestHandler from './mqtt/mqtt-request.handler.js';
import MqttService, { MQTT_CONNECT } from './mqtt/mqtt.service.js';
import FsmController from './fsm/fsm.controller.js';
import FsmService from './fsm/fsm.service.js';
import HealthService from './health.service.js';
import HealthController from './health.controller.js';
import ParametersController from './parameters.controller.js';
import WebhookClient from './notify/webhook.client.js';
import Notifier from './notify/notifier.service.js';
import AccessGuard from './auth/access.guard.js';
import PeersController from './peers/peers.controller.js';
import PeerWatch from './peers/peer-watch.js';
import PeerEventsService from './fsm/peer-events.service.js';

@Module({
  imports: [],
  controllers: [
    AppController,
    FsmController,
    HealthController,
    ParametersController,
    PeersController,
  ],
  providers: [
    ExecaManager,
    Queue,
    RunnerFactory,
    Config,
    FsmService,
    DescriptorService,
    MqttRequestHandler,
    MqttService,
    { provide: MQTT_CONNECT, useValue: connect },
    HealthService,
    WebhookClient,
    Notifier,
    PeerWatch,
    PeerEventsService,
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
})
export default class AppModule {}
