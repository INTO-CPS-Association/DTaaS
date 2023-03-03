import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from '../files/files.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs'
import path from 'path';
import { readdir } from 'fs/promises';


describe('FilesService', () => {
  let filesService: FilesService; 

  const mockConfigService = {
    get: jest.fn(() => '/Users/phillipravn/DTaaS/data/assets/user')
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        ConfigService],
    }).overrideProvider(ConfigService).useValue(mockConfigService).compile();
  
    filesService = module.get<FilesService>(FilesService);
  });


    it('should return the filenames in the given directory', () => {
      // the mockvalue that our test will use
      const files = ["1"]

      // mock the fs.readdirSync function to return the desired path for the test
      const fs = require('fs');
      jest.mock('fs', () => ({
        readdirSync: jest.fn(() => files)
      }));
    
      // get the result from our actual function, given the path ''
      const result = filesService.getFilesInDirectory('');

      // compare the result to the expected value
      expect(result).toEqual(fs.readdirSync('/Users/phillipravn'));
      
    });
  }); 
