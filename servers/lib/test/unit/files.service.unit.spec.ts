import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "../../src/files/files.service";
import { ConfigService } from "@nestjs/config";
import * as dotenv from "dotenv";
import {
  MockConfigService,
  mockQueryResponseData,
  pathToTestDirectory,
  testDirectory,
} from "../testUtil";
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

  // test if the filesService is defined
  it("should be defined", () => {
    expect(filesService).toBeDefined();
  });

  describe("getLocalFiles", () => {
    it("should be defined", () => {
      expect(filesService.getLocalFiles).toBeDefined();
    });

    it("should return the filenames in the given directory", async () => {
      jest.mock("fs", () => ({
        readdirSync: jest.fn(() => testDirectory),
      }));

      const result = await filesService.getLocalFiles(pathToTestDirectory);
      expect(result.sort()).toEqual(testDirectory.sort());
    });
  });

  describe("getGitlabFiles", () => {
    it("should be defined", () => {
      expect(filesService).toBeDefined();
    });

    it("should return a list of files from Gitlab", async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          data: mockQueryResponseData,
        }),
      };
      jest
        .spyOn(filesService, "createClient")
        .mockResolvedValue(mockClient as any);

      const result = await filesService.getGitlabFiles(pathToTestDirectory);
      expect(result).toEqual(testDirectory);
    });

    it("should throw an error if response from GitLab API is invalid", async () => {
      const expected = ["Invalid query"];
      const path = "invalid_path";
      const result = await filesService.getGitlabFiles(path);
      expect(result).toEqual(expected);
    });
  });

  describe("Wrapper method", () => {
    it('should return "Invalid query" if no path is provided', async () => {
      expect(await filesService.Wrapper("")).toEqual(["Invalid query"]);
    });

    it("should call getLocalFiles when mode is local", async () => {
      jest
        .spyOn(filesService, "getLocalFiles")
        .mockResolvedValue(testDirectory);

      const result = await filesService.Wrapper(pathToTestDirectory);

      expect(result).toEqual(testDirectory);
    });

    it("should call getGitlabFiles when mode is gitlab", async () => {
      jest
        .spyOn(filesService, "getGitlabFiles")
        .mockResolvedValue(testDirectory);

      const result = await filesService.Wrapper(pathToTestDirectory);

      expect(result).toEqual(testDirectory);
    });
  });
});
