import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
} from '@nestjs/common';
import { AccessRoute } from '../auth/roles.js';
import DescriptorService from '../descriptor.service.js';
import { PeersBody, peersBodySchema, PeersDto } from '../dto/peers.dto.js';
import ZodValidationPipe from '../validation.pipe.js';

@Controller('peers')
export default class PeersController {
  constructor(private readonly descriptor: DescriptorService) {}

  @Get()
  @AccessRoute('peers')
  get(): PeersDto {
    return this.descriptor.peers().document();
  }

  // Enables and disables listed peers; the route is idempotent, so it
  // takes no request key
  @Put()
  @AccessRoute('set-peers')
  set(@Body(new ZodValidationPipe(peersBodySchema)) body: PeersBody): PeersDto {
    const problems = this.descriptor.peers().set(body);
    if (problems.length > 0) {
      throw new BadRequestException(problems);
    }
    return this.get();
  }
}
