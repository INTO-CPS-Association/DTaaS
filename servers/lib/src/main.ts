#!/usr/bin/env node
import { Command } from "commander";
import bootstrap from "./bootstrap";

type ProgramOptions = {
  config?: string
}

const program = new Command();

program
    .description("Start libms")
    .option('-c, --config <path>', "If not specified it will assume '.env' is the path")

program.parse(process.argv);

const options: ProgramOptions = program.opts();

if (options.config) {
    bootstrap({config: options.config})
} else {
    bootstrap();
}