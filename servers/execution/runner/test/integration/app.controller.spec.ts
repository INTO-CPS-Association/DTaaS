import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import AppModule from 'src/app.module';
import AppController from 'src/app.controller';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Response } from 'express';
import { ExecuteCommandDto } from 'src/dto/command.dto';
import { Manager } from 'src/interfaces/command.interface';
import ExecaManager from 'src/execa-manager.service';

type ResponseBody = {
  status: string;
};

let mockBlackhole: jest.Mock;

describe('Test AppController', () => {
  let app: INestApplication;
  let controller: AppController;
  let manager: Manager;

  async function newCommandTest(
    executeCommandDto: ExecuteCommandDto,
    httpStatus: HttpStatus,
    resBody: ResponseBody,
  ) {
    mockBlackhole = jest.fn();
    const res: Response = {} as Response;

    res.status = function status(): Response {
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

    expect(spyManager).toHaveBeenCalledWith(executeCommandDto.name);
    expect(resStatus).toHaveBeenCalledWith(httpStatus);
    expect(resSend).toHaveBeenCalledWith(resBody);
  }

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    controller = app.get<AppController>(AppController);
    manager = app.get<ExecaManager>(ExecaManager);
  });

  afterEach(() => jest.resetAllMocks());

  it('Should start with empty command history', () => {
    expect(controller.getHistory()).toEqual([]);
  });

  it('should execute an available command', async () => {
    await newCommandTest({ name: 'create' }, HttpStatus.OK, {
      status: 'success',
    });
  });

  it('should not execute an unavailable command', async () => {
    await newCommandTest({ name: 'test' }, HttpStatus.BAD_REQUEST, {
      status: 'invalid command',
    });
  });

  it('Should have correct command history', async () => {
    await newCommandTest({ name: 'create' }, HttpStatus.OK, {
      status: 'success',
    });
    await newCommandTest({ name: 'test' }, HttpStatus.BAD_REQUEST, {
      status: 'invalid command',
    });
    expect(controller.getHistory()).toEqual([
      {
        name: 'create',
      },
      {
        name: 'test',
      },
    ]);
  });

  it('Should return correct command status', async () => {
    await newCommandTest({ name: 'create' }, HttpStatus.OK, {
      status: 'success',
    });
    const successStatus = await controller.cmdStatus();

    await newCommandTest({ name: 'test' }, HttpStatus.BAD_REQUEST, {
      status: 'invalid command',
    });
    const unsuccessStatus = await controller.cmdStatus();

    expect(successStatus).toEqual({
      name: 'create',
      status: 'valid',
      logs: {
        stdout: 'hello world',
        stderr: '',
      },
    });
    expect(unsuccessStatus).toEqual({
      name: 'test',
      status: 'invalid',
      logs: {
        stdout: '',
        stderr: '',
      },
    });
  });
});
