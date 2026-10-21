import { Module } from '@nestjs/common';
import ConfigModule from '../config/config.module.js';
import DigitalTwinsController from './digital-twins.controller.js';
import DigitalTwinsService from './digital-twins.service.js';
import DtAutomationFacade from './dt-automation/dt-automation-facade.js';
import { DIGITAL_TWINS_SERVICE } from './interfaces/digital-twins.service.interface.js';

@Module({
  imports: [ConfigModule],
  controllers: [DigitalTwinsController],
  providers: [
    DtAutomationFacade,
    DigitalTwinsService,
    { provide: DIGITAL_TWINS_SERVICE, useExisting: DigitalTwinsService },
  ],
  exports: [DIGITAL_TWINS_SERVICE],
})
export default class DigitalTwinsModule {}
