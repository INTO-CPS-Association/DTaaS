import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ExecuteCommandDto } from './dto/command.dto';

export default class ZodValidationPipe implements PipeTransform {
  // eslint-disable-next-line no-empty-function, no-useless-constructor
  constructor(private schema: ZodSchema) {}

  transform(value: ExecuteCommandDto) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      throw new BadRequestException('Validation Failed');
    }
  }
}
