import { Injectable } from '@nestjs/common';
import { logEventSchema } from './dto/log-event.dto.js';
import ZodValidationPipe from './validation.pipe.js';

@Injectable()
export default class LogEventValidationPipe extends ZodValidationPipe {
  constructor() {
    super(logEventSchema);
  }
}
