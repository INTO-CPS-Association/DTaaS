import { Test, TestingModule } from '@nestjs/testing';
import AppController from 'src/app.controller';
import AppService from 'src/app.service';
import Queue from 'src/queue.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, Queue],
    }).compile();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      const appController = app.get(AppController);
      expect(appController.getHello()).toStrictEqual(["hello"]);
    });
  });
});
