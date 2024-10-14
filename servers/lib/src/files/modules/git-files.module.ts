import { Module } from '@nestjs/common';
import GitFilesService from '../services/git-files.service.js';

@Module({
    providers: [GitFilesService],
    exports: [GitFilesService]
})
export class GitFilesModule {}