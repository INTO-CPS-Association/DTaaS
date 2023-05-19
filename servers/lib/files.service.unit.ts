import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "./src/files/interfaces/files.service.interface";
import { ConfigService } from "@nestjs/config";
import * as dotenv from "dotenv";
import * as fs from "fs";
import {
  MockConfigService,
  testDirectory,
  pathToTestDirectory,
  pathToTestFileContent,
  testFileContent,
} from "./test/testUtil";
import { ApolloClient, gql } from "@apollo/client/core";
dotenv.config({ path: ".env" });

describe("Unit tests for FilesService", () => {
  let filesService: FilesService;
  const mockConfigService = new MockConfigService();

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

      jest
        .spyOn(filesService, "listLocalDirectory")
        .mockImplementation((pathToTestDirectory) => {
          return Promise.resolve(testDirectory);
        });

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

    it("should call listDirectory when called with 'listDirectory' and MODE is 'gitlab'", async () => {
      process.env.MODE = "gitlab";
      jest
        .spyOn(filesService, "listGitlabDirectory")
        .mockImplementation((pathToTestDirectory) => {
          return Promise.resolve(testDirectory);
        });

      const result = await filesService.Wrapper(
        "listDirectory",
        pathToTestDirectory
      );
      expect(result).toEqual(testDirectory);
    });

    it("should call readGitlabFile when called with 'readFile' and MODE is 'gitlab'", async () => {
      process.env.MODE = "gitlab";

      jest
        .spyOn(filesService, "readGitlabFile")
        .mockImplementation((pathToTestFileContent) => {
          return Promise.resolve([testFileContent]);
        });

      const result = await filesService.Wrapper(
        "readFile",
        pathToTestFileContent
      );
      expect(result).toEqual([testFileContent]);
    });

    it("should throw an error if run in unknown mode", async () => {
      process.env.MODE = "unknown";

      const result = await filesService.Wrapper(
        "listDirectory",
        pathToTestDirectory
      );
      expect(result).toEqual(["Invalid query"]);
    });

    it("should throw an error if no path is given", async () => {
      process.env.MODE = "local";

      const result = await filesService.Wrapper("listDirectory", "");
      expect(result).toEqual(["Invalid query"]);
    });
  });

  describe("listLocalDirectory", () => {
    it("should be defined", () => {
      expect(filesService.listLocalDirectory).toBeDefined();
    });

    it("should give fs.readdir correct concatenation of datapath and path", async () => {
      jest.spyOn(fs, "readdirSync" as any).mockImplementation(() => {
        return testDirectory;
      });

      await filesService.listLocalDirectory(pathToTestDirectory);

      expect(fs.readdirSync).toHaveBeenCalledWith(
        `${process.env.TEST_PATH}/${pathToTestDirectory}`
      );
    });

    it("should return the correct list of files and folders at the given path", async () => {
      jest.spyOn(fs, "readdirSync" as any).mockImplementation(() => {
        return testDirectory;
      });

      const result = await filesService.listLocalDirectory(pathToTestDirectory);

      expect(result).toEqual(testDirectory);
    });

    /* it("should return an error if the directory does not exist", async () => {
      jest.spyOn(fs, "readdirSync" as any).mockImplementation(() => {
        throw new Error("File not found");
      });

      const result = await filesService.listLocalDirectory(pathToTestDirectory);

      expect(result).toEqual(["File not found"]);
    }); */
  });

  describe("readLocalFile", () => {
    it("should be defined", () => {
      expect(filesService.readLocalFile).toBeDefined();
    });

    it("shoud give fs.readFileSync correct concatenation of datapath and path", async () => {
      jest.spyOn(fs, "readFileSync" as any).mockImplementation(() => {
        return testFileContent;
      });

      await filesService.readLocalFile(pathToTestFileContent);

      expect(fs.readFileSync).toHaveBeenCalledWith(
        `${process.env.TEST_PATH}/${pathToTestFileContent}`,
        "utf8"
      );
    });

    it("should return the correct content of the file at the given path", async () => {
      jest.spyOn(fs, "readFileSync" as any).mockImplementation(() => {
        return testFileContent;
      });

      const result = await filesService.readLocalFile(pathToTestFileContent);

      expect(result).toEqual([testFileContent]);
    });

    it("should handle file read error and return 'Invalid query'", async () => {
      jest.spyOn(fs, "readFileSync").mockImplementation(() => {
        throw new Error("File read error");
      });

      const result = await filesService.readLocalFile("invalidPath");

      expect(result).toEqual(["Invalid query"]);
    });
  });

  describe("listGitlabDirectory", () => {
    it("should be defined", () => {
      expect(filesService.listGitlabDirectory).toBeDefined();
    });
  });
});
