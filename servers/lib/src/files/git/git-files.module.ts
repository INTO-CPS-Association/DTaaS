import { Module } from '@nestjs/common';
import GitFilesService from './git-files.service.js';
import LocalFilesService from '../local/local-files.service.js';

@Module({
  providers: [GitFilesService, LocalFilesService],
  exports: [GitFilesService],
})
export class GitFilesModule {}
