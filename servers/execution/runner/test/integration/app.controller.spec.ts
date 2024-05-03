import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Test } from "@nestjs/testing";
import AppModule from "src/app.module";
import AppController from "src/app.controller";
import { INestApplication } from "@nestjs/common";
import { Response } from 'express';
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

  it('should call newCommand with the correct arguments', async () => {
    const executeCommandDto: ExecuteCommandDto = { name: 'test' };
    const res: Response = {} as Response;
    res.status = function status(): Response {
      return res;
    };
    res.send = function send(): Response {
      return res;
    };
    const resStatus = jest.spyOn(res, 'status');
    const resSend = jest.spyOn(res, 'send');
    await controller.changePhase(executeCommandDto, res);

    expect(resStatus).toHaveBeenCalled();
    expect(resSend).toHaveBeenCalled();
  });

});
