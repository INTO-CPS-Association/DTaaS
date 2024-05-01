import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Test } from "@nestjs/testing";
import AppModule from "src/app.module";
import AppController from "src/app.controller";
import { INestApplication } from "@nestjs/common";
import { response } from 'express';
import { ExecuteCommandDto } from "src/dto/command.dto";

describe('Test AppController', () => {
  let app: INestApplication;
  let controller: AppController;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    controller = app.get<AppController>(AppController);


  });

  afterEach(() => jest.resetAllMocks());

  it('Should start with empty command history', () => {
    expect(controller
      .getHistory()).toEqual([]);
  });

  it.skip('Should execute valid command', () => {
    const command: ExecuteCommandDto = { 'name': 'create' };

    expect(controller
      .changePhase(command, response))
      .resolves;
  });

});