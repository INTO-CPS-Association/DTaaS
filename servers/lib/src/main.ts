#!/usr/bin/env node
import { Command } from 'commander';
import bootstrap from './bootstrap.js';

export type ProgramOptions = {
  config?: string;
  http?: string;
};

const program = new Command();

program
  .description(
    'The lib microservice is a file server. It supports file transfer over GraphQL and HTTP protocols.',
  )
  .option('-c, --config <file>', 'provide the config file (default .env)')
  .option(
    '-H, --http <file>',
    'enable the HTTP server with the specified config',
  )
  .helpOption('-h, --help', 'display help for libms')
  .showHelpAfterError();

program.parse(process.argv);

const options: ProgramOptions = program.opts();

bootstrap({
  config: options.config,
  httpServer: options.http,
  runHelp: () => program.help(),
});
