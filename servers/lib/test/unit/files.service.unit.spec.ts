import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "../../src/files/files.service";
import { ConfigService } from "@nestjs/config";
import * as dotenv from "dotenv";
import { MockConfigService, files, localFiles, path } from "../testUtil";
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
        readdirSync: jest.fn(() => localFiles),
      }));

      const result = await filesService.getLocalFiles(path);

      expect(result.sort()).toEqual(localFiles.sort());
    });
  });

  describe("getGitlabFiles", () => {
    it("should be defined", () => {
      expect(filesService).toBeDefined();
    });

    it("should return the filenames in the given directory", async () => {
      const result = await filesService.getGitlabFiles(path);

      expect(result.sort()).toEqual(files.sort());
    });

    it("should throw an error if response from GitLab API is invalid", async () => {
      const expected = ["Invalid query"];
      const path = "invalid_path";
      const result = await filesService.getGitlabFiles(path);
      expect(result).toEqual(expected);
    });
  });

  describe("Wrapper", () => {
    it("should be defined", () => {
      expect(filesService.Wrapper).toBeDefined();
    });

    it("should throw an error if path is empty", async () => {
      const path = "";
      const expected = ["Invalid query"];
      const result = await filesService.Wrapper(path);
      expect(result).toEqual(expected);
    });

    it("should return local files when run in local mode", async () => {
      process.env.MODE = "local";

      jest.mock("fs", () => ({
        readdirSync: jest.fn(() => localFiles),
      }));

      const result = await filesService.Wrapper(path);

      expect(result.sort()).toEqual(localFiles.sort());
    });

    it("should return gitlab files when run in gitlab mode", async () => {
      process.env.MODE = "gitlab";
      const result = await filesService.Wrapper(path);

      expect(result.sort()).toEqual(files.sort());
    });

    it("should return an error when run in an unknown mode", async () => {
      process.env.MODE = "unknown";

      const expected = ["Invalid query"];
      const result = await filesService.Wrapper(path);
      expect(result).toEqual(expected);
    });
  });
});
