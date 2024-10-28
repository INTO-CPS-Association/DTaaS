import { Module } from '@nestjs/common';
import GitFilesService from './git-files.service.js';

@Module({
  providers: [GitFilesService],
  exports: [GitFilesService],
})
export class GitFilesModule {}
