import { Module } from '@nestjs/common';
import LocalFilesService from '../services/local-files.service.js';

@Module({
  providers: [LocalFilesService],
  exports: [LocalFilesService]
})
export class LocalFilesModule {}
