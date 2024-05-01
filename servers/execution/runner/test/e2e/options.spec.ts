import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import AppModule from 'src/app.module';
import { getRequest, postRequest, queriesJSON, RequestBody } from './util';
import Keyv from 'keyv';
import Config from 'src/config/configuration.service';

const OptionsArray = [{
  'option': null,
  'testName': 'default configuration',
},
{
  'option': async (): Promise<Keyv> => {
    const keyv = new Keyv();
    await keyv.set('configFile', 'runner.yaml');
    return keyv;
  },
  'testName': 'configuration loaded from configuration file',
}];

OptionsArray.forEach((element) => {
  describe(`Runner end-to-end tests with ${element.testName}`, () => {
    let app: INestApplication;

    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
  
      app = moduleFixture.createNestApplication();
      if (element.option !== null) {
        const config = app.get<Config>(Config);
        config.loadConfig(await element.option());
      }
      await app.init();
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
          postRequest({
            'app': app,
            'route': '/',
            'HttpStatus': query.HttpStatus,
            'reqBody': query.reqBody,
            'resBody': query.resBody.POST,
          }));
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
            {
              'app': app,
              'route': '/',
              'HttpStatus': query.HttpStatus,
              'reqBody': query.reqBody,
              'resBody': query.resBody.POST,
            });
          return getRequest(
            {
              'app': app,
              'route': '/',
              'HttpStatus': 200,
              'reqBody': {},
              'resBody': query.resBody.GET});
        });
      });
  
      it('execution status without any prior command executions', () =>
        getRequest(
          {
            'app': app,
            'route': '/',
            'HttpStatus': 200,
            'reqBody': {},
            'resBody': { name: 'none', status: 'invalid', logs: { stdout: '', stderr: '' }}
      }));
    });
  
    describe('GET /history', () => {
      it('without any prior command executions', () =>
        getRequest(
          {
            'app': app,
            'route': '/history',
            'HttpStatus': 200,
            'reqBody': {},
            'resBody': new Array<RequestBody>(),
      }));
  
      it('after two valid command executions', async () => {
        await postRequest({
          'app': app,
          'route': '/',
          'HttpStatus': queriesJSON.valid.HttpStatus,
          'reqBody': queriesJSON.valid.reqBody,
          'resBody': queriesJSON.valid.resBody.POST,
        });
        await postRequest({
          'app': app,
          'route': '/',
          'HttpStatus': queriesJSON.valid.HttpStatus,
          'reqBody': queriesJSON.valid.reqBody,
          'resBody': queriesJSON.valid.resBody.POST,
        });
        return getRequest(
          {
            'app': app,
            'route': '/history',
            'HttpStatus': 200,
            'reqBody': {},
            'resBody': [
              { name: 'create' },
              { name: 'create' },
            ],
      });
      });
    });
});
  
});
