import { Module } from '@nestjs/common';
import ConfigModule from '../config/config.module.js';
import DigitalTwinsService from './digital-twins.service.js';
import DtAutomationFacade from './dt-automation/dt-automation-facade.js';
import { DIGITAL_TWINS_SERVICE } from './interfaces/digital-twins.service.interface.js';

@Module({
  imports: [ConfigModule],
  providers: [
    DtAutomationFacade,
    DigitalTwinsService,
    { provide: DIGITAL_TWINS_SERVICE, useExisting: DigitalTwinsService },
  ],
})
export default class DigitalTwinsModule {}
