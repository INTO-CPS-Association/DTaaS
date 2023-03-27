import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "../src/files/files.service";
import { ConfigService } from "@nestjs/config";
import ApolloClient from "apollo-client";

describe("FilesService", () => {
  let filesService: FilesService;

  // Mocked value of our ConfigService, so it just gives a hardcoded value out,
  // so that we dont increase the complexity of our test
  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case "TOKEN":
          return "glpat-ysRcoUyuxB-M_oG5X71T";
        case "LOCAL_PATH":
          return "/Users/phillipravn/DTaaS/data/assets/";
        case "GITLAB_URL":
          return "https://gitlab.com/api/graphql";
        case "GITLAB_GROUP":
          return "dtaas/";
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
      const files = ["digital twins", "functions", "data", "tools", "models"];
      const path = "user1";

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
      jest
        .spyOn(ApolloClient.prototype, "query")
        .mockImplementation(() => ApolloClient as any);

      await expect(
        filesService.getGitlabFiles("mock-path")
      ).rejects.toThrowError("Invalid response from GitLab API");
    });
  });

  describe("Wrapper", () => {
    it("should be defined", () => {
      expect(filesService.Wrapper).toBeDefined();
    });

    it("should return local files when run in local mode", async () => {
      const path = "user1";
      process.env.MODE = "local";
      const expected = [
        "digital twins",
        "functions",
        "data",
        "tools",
        "models",
      ];

      jest.mock("fs", () => ({
        readdirSync: jest.fn(() => expected),
      }));

      const result = await filesService.Wrapper(path);

      expect(result.sort()).toEqual(expected.sort());
    });
  });

  it("should return gitlab files when run in gitlab mode", async () => {
    const path = "user1";
    process.env.MODE = "gitlab";

    const expected = ["digital twins", "functions", "data", "tools", "models"];

    const result = await filesService.Wrapper(path);

    expect(result.sort()).toEqual(expected.sort());
  });

  it("should return an error when run in an unknown mode", async () => {
    const path = "user1";
    process.env.MODE = "unknown";

    const expected = new Error("Invalid mode");

    try {
      await filesService.Wrapper(path);
    } catch (error) {
      expect(error).toEqual(expected);
    }
  });
});
