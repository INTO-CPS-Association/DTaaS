import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Test } from "@nestjs/testing";
import AppModule from "src/app.module";
import AppController from "src/app.controller";
import { HttpStatus, INestApplication } from "@nestjs/common";
import { Response } from 'express';
import { ExecuteCommandDto } from "src/dto/command.dto";
import { Manager } from "src/interfaces/command.interface";
import ExecaManager from "src/execa-manager.service";

type ResponseBody = {
  'status': string;
}

let mockBlackhole: jest.Mock;

describe('Test AppController', () => {
  let app: INestApplication;
  let controller: AppController;
  let manager: Manager;

  beforeEach(async () => {
    mockBlackhole = jest.fn();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    controller = app.get<AppController>(AppController);
    manager = app.get<ExecaManager>(ExecaManager);
  });

  afterEach(() => jest.resetAllMocks());

  it('Should start with empty command history', () => {
    expect(controller
      .getHistory()).toEqual([]);
  });

  it('should call newCommand with unavailable command', async () => {
    const executeCommandDto: ExecuteCommandDto = { name: 'test' };
    const res: Response = {} as Response;

    res.status = function status(httpStatus: HttpStatus): Response {
      mockBlackhole(httpStatus);
      return res;
    };
    res.send = function send(body: ResponseBody): Response {
      mockBlackhole(body);
      return res;
    };
    const resStatus = jest.spyOn(res, 'status');
    const resSend = jest.spyOn(res, 'send');
    const spyManager = jest.spyOn(manager, 'newCommand');

    await controller.changePhase(executeCommandDto, res);

    expect(spyManager).toHaveBeenCalledWith('test');
    expect(resStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(resSend).toHaveBeenCalledWith({
      status: 'invalid command',
    });
  });

});
