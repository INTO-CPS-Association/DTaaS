#!/usr/bin/env node
import { Command } from "commander";
import bootstrap from "./bootstrap";

type ProgramOptions = {
  config?: string
}

const program = new Command();

program
    .description("The lib microservice is responsible for handling and serving the contents of library assets of the DTaaS platform. It provides API endpoints for clients to query, and fetch these assets.")
    .option('-c, --config <path>', "(default .env)")

program.parse(process.argv);

const options: ProgramOptions = program.opts();

if (options.config) { 
    bootstrap({config: options.config})
} else {
    program.help();
}
