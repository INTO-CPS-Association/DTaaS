import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import AppModule from 'src/app.module';
import Config from 'src/config/configuration.service';
import Keyv from 'keyv';
import { getRequest, postRequest, queriesJSON } from './util';

describe('Runner end-to-end tests with a configuration file', () => {
  let app: INestApplication;
  const CLIOptions = new Keyv();

  beforeAll(async () => {
    // TODO: Move to the testing config file named testing.yaml
    await CLIOptions.set('configFile', 'runner.yaml');
  });

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const config = app.get<Config>(Config);
    config.loadConfig(CLIOptions);
    await app.init();
    await app.listen(config.getPort());
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /', () => {
    const keys: (keyof typeof queriesJSON)[] = [
      'valid',
      'invalid',
      'incorrect',
    ];
    keys.forEach((key) => {
      const query = queriesJSON[key];
      it(`execute ${key} command`, () =>
        postRequest(
          app,
          '/',
          query.HttpStatus,
          query.reqBody,
          query.resBody.POST,
        ));
    });
  });

  describe('GET /', () => {
    const keys: (keyof typeof queriesJSON)[] = [
      'valid',
      'invalid',
      'incorrect',
    ];
    keys.forEach((key) => {
      const query = queriesJSON[key];
      it(`execution status of ${key} command`, async () => {
        await postRequest(
          app,
          '/',
          query.HttpStatus,
          query.reqBody,
          query.resBody.POST,
        );
        return getRequest(app, '/', 200, {}, query.resBody.GET);
      });
    });

    it('execution status without any prior command executions', () =>
      getRequest(
        app,
        '/',
        200,
        {},
        { name: 'none', status: 'invalid', logs: { stdout: '', stderr: '' } },
      ));
  });

  describe('GET /history', () => {
    it('without any prior command executions', () =>
      getRequest(app, '/history', 200, {}, []));

    it('after two valid command executions', async () => {
      await postRequest(
        app,
        '/',
        queriesJSON.valid.HttpStatus,
        queriesJSON.valid.reqBody,
        queriesJSON.valid.resBody.POST,
      );
      await postRequest(
        app,
        '/',
        queriesJSON.valid.HttpStatus,
        queriesJSON.valid.reqBody,
        queriesJSON.valid.resBody.POST,
      );
      return getRequest(app, '/history', 200, {}, [
        { name: 'create' },
        { name: 'create' },
      ]);
    });
  });
});
