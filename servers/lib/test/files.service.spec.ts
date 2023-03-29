import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "../src/files/files.service";
import { ConfigService } from "@nestjs/config";
require("dotenv").config({ path: ".env" });

describe("FilesService", () => {
  let filesService: FilesService;

  // Mocked value of our ConfigService, so it just gives a hardcoded value out,
  // so that we dont increase the complexity of our test
  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case "TOKEN":
          return process.env.TOKEN;
        case "LOCAL_PATH":
          return process.env.TEST_PATH;
        case "GITLAB_URL":
          return process.env.GITLAB_URL;
        case "GITLAB_GROUP":
          return "dtaas";
        case "MODE":
          if (process.env.MODE === "gitlab") {
            return "gitlab";
          } else if (process.env.MODE === "local") {
            return "local";
          } else {
            return "unknown";
          }
        default:
          return undefined;
      }
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

  // test if the filesService is defined
  it("should be defined", () => {
    expect(filesService).toBeDefined();
  });

  describe("getLocalFiles", () => {
    it("should be defined", () => {
      expect(filesService.getLocalFiles).toBeDefined();
    });

    it("should return the filenames in the given directory", async () => {
      const files = ["test_file1", "test_file2", "test_file3"];
      const path = "test_user1";

      jest.mock("fs", () => ({
        readdirSync: jest.fn(() => files),
      }));

      const result = await filesService.getLocalFiles(path);

      expect(result.sort()).toEqual(files.sort());
    });
  });

  describe("getGitlabFiles", () => {
    it("should be defined", () => {
      expect(filesService).toBeDefined();
    });

    it("should return the filenames in the given directory", async () => {
      const expected = [
        "digital twins",
        "functions",
        "data",
        "tools",
        "models",
      ];
      const path = "user1";
      const result = await filesService.getGitlabFiles(path);

      expect(result.sort()).toEqual(expected.sort());
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
      const path = "test_user1";
      process.env.MODE = "local";
      const expected = ["test_file1", "test_file2", "test_file3"];

      jest.mock("fs", () => ({
        readdirSync: jest.fn(() => expected),
      }));

      const result = await filesService.Wrapper(path);

      expect(result.sort()).toEqual(expected.sort());
    });

    it("should return gitlab files when run in gitlab mode", async () => {
      const path = "user1";
      process.env.MODE = "gitlab";

      const expected = [
        "digital twins",
        "functions",
        "data",
        "tools",
        "models",
      ];

      const result = await filesService.Wrapper(path);

      expect(result.sort()).toEqual(expected.sort());
    });

    it("should return an error when run in an unknown mode", async () => {
      const path = "user1";
      process.env.MODE = "unknown";

      const expected = ["Invalid query"];
      const result = await filesService.Wrapper(path);
      expect(result).toEqual(expected);
    });
  });
});
