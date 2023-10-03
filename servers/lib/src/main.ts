#!/usr/bin/env node
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import AppModule from "./app.module";
import { parse } from "dotenv";
import { readFileSync } from "fs";

async function bootstrap() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const configFileIndex = args.findIndex(arg => arg === "-c" || arg === "--config");

  // Read configuration from the specified file
  if (configFileIndex !== -1 && args[configFileIndex + 1]) {
    const configFilePath = args[configFileIndex + 1];
    const configBuffer = readFileSync(configFilePath);
    parse(configBuffer);
  } else {
    return;
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT");
  await app.listen(port);
}

bootstrap();