import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "../../src/files/files.service";
import { ConfigService } from "@nestjs/config";
import * as dotenv from "dotenv";
import * as fs from "fs";
import {
  MockConfigService,
  testDirectory,
  pathToTestDirectory,
  pathToTestFileContent,
  testFileContent,
} from "../testUtil";
dotenv.config({ path: ".env" });

describe("Unit tests for FilesService", () => {
  let filesService: FilesService;
  const mockConfigService = new MockConfigService();

  const mockFilesService = {
    listLocalDirectory: jest.fn((pathToTestDirectory) => {
      testDirectory;
    }),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FilesService, ConfigService],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    // get the filesService from the module
    filesService = module.get<FilesService>(FilesService);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  // test if the filesService is defined
  it("should be defined", () => {
    expect(filesService).toBeDefined();
  });

  describe("Wrapper", () => {
    it("should be defined", () => {
      expect(filesService.Wrapper).toBeDefined();
    });

    it("should call listLocalDirectory when called with 'listDirectory' and MODE is 'local'", async () => {
      process.env.MODE = "local";

      const result = await filesService.Wrapper(
        "listDirectory",
        pathToTestDirectory
      );

      expect(result).toEqual(testDirectory);
    });

    it("should call readLocalFile when called with 'readFile' and MODE is 'local'", async () => {
      process.env.MODE = "local";

      jest
        .spyOn(filesService, "readLocalFile")
        .mockImplementation((pathToTestFileContent) => {
          return Promise.resolve([testFileContent]);
        });

      const result = await filesService.Wrapper(
        "readFile",
        pathToTestFileContent
      );
      expect(result).toEqual([testFileContent]);
    });
  });
});
