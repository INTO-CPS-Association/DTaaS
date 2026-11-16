import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import AppModule from 'src/app.module';
import AppController from 'src/app.controller';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Response } from 'express';
import { ExecuteCommandDto, runOptions } from 'src/dto/command.dto';
import { Manager } from 'src/interfaces/command.interface';
import ExecaManager from 'src/execa-manager.service';
import Keyv from 'keyv';
import Config from 'src/config/configuration.service';
import FsmService from 'src/fsm/fsm.service';
import { MEASURED, UNMEASURED } from 'test/utils';

type ResponseBody = {
  status: string;
  result?: {
    exitCode: number | null;
    stdout: string;
    stderr: string;
    resources: unknown;
  };
};

const SUCCESS = {
  status: 'success',
  result: {
    exitCode: 0,
    stdout: 'hello world',
    stderr: '',
    resources: MEASURED,
  },
};

let mockBlackhole: jest.Mock;

describe('Test AppController', () => {
  let app: INestApplication;
  let controller: AppController;
  let manager: Manager;
  const CLIOptions: Keyv = new Keyv();
  let config: Config;

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

    await controller.newCommand(executeCommandDto, res, {});

    expect(spyManager).toHaveBeenCalledWith(executeCommandDto.name, undefined, {
      ...runOptions(executeCommandDto, {}),
      env: expect.objectContaining({ DT_ID: 'test-runner' }),
    });
    expect(resStatus).toHaveBeenCalledWith(httpStatus);
    expect(resSend).toHaveBeenCalledWith(resBody);
  }

  beforeAll(async () => {
    await CLIOptions.set('configFile', 'runner.test.yaml');
  });

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    controller = app.get<AppController>(AppController);
    manager = app.get<ExecaManager>(ExecaManager);
    config = app.get<Config>(Config);
    await config.loadConfig(CLIOptions);
    app.get<FsmService>(FsmService).load();
  });

  afterEach(() => jest.resetAllMocks());

  it('Should start with empty command history', () => {
    expect(controller.getHistory({ limit: 100 })).toEqual([]);
  });

  it('should execute an available command', async () => {
    await newCommandTest({ name: 'create' }, HttpStatus.OK, SUCCESS);
  });

  it('should answer a failing script with its result', async () => {
    await newCommandTest({ name: 'fail' }, HttpStatus.OK, {
      status: 'failed',
      result: {
        exitCode: 3,
        stdout: '',
        stderr: 'no free bed',
        resources: MEASURED,
      },
    });
  });

  it('should not execute an unavailable command', async () => {
    await newCommandTest({ name: 'test' }, HttpStatus.BAD_REQUEST, {
      status: 'invalid command',
    });
  });

  it('Should have correct command history', async () => {
    await newCommandTest({ name: 'create' }, HttpStatus.OK, SUCCESS);
    await newCommandTest({ name: 'test' }, HttpStatus.BAD_REQUEST, {
      status: 'invalid command',
    });
    expect(controller.getHistory({ limit: 100 })).toEqual([
      expect.objectContaining({ id: 1, name: 'create', status: 'valid' }),
      expect.objectContaining({ id: 2, name: 'test', status: 'invalid' }),
    ]);
  });

  it('Should return correct command status after valid command execution followed by invalid command execution', async () => {
    await newCommandTest({ name: 'create' }, HttpStatus.OK, SUCCESS);
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
      exitCode: 0,
      resources: MEASURED,
    });
    expect(unsuccessStatus).toEqual({
      name: 'test',
      status: 'invalid',
      logs: {
        stdout: '',
        stderr: '',
      },
      exitCode: null,
      resources: UNMEASURED,
    });
  });

  it('Should return correct command status without any prior command execution', async () => {
    const unsuccessStatus = await controller.cmdStatus();

    expect(unsuccessStatus).toEqual({
      name: 'none',
      status: 'invalid',
      logs: {
        stdout: '',
        stderr: '',
      },
      exitCode: null,
      resources: UNMEASURED,
    });
  });
});
