import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import * as dotenv from "dotenv"
import AppModule from "./app.module";

type BootstrapOptions = {
  config?: string
}

export default async function bootstrap(options?: BootstrapOptions) {
  dotenv.config({path: options?.config ?? ".env", override: true});
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT");
  await app.listen(port);
}