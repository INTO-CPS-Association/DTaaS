import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { GitlabFilesService } from "../../src/files/services/gitlab-files.service";
import {
  mockListDirectoryResponseData,
  mockReadFileResponseData,
  pathToTestFileContent,
  testFileContent,
} from "../testUtil";
import {
  MockConfigService,
  pathToTestDirectory,
  testDirectory,
} from "../testUtil";
import { create } from "domain";

describe("GitlabFilesService", () => {
  let filesService: GitlabFilesService;
  const mockConfigService = new MockConfigService();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitlabFilesService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    filesService = module.get<GitlabFilesService>(GitlabFilesService);
  });

  it("should list directory", async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({
        data: mockListDirectoryResponseData,
      }),
    };
    jest
      .spyOn(filesService, "createClient")
      .mockResolvedValue(mockClient as any);

    const result = await filesService.listDirectory(pathToTestDirectory);
    expect(result).toEqual(testDirectory);
  });

  it("should read file", async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({
        data: mockReadFileResponseData,
      }),
    };
    jest
      .spyOn(filesService, "createClient")
      .mockResolvedValue(mockClient as any);

    const result = await filesService.readFile(pathToTestFileContent);
    expect(result).toEqual(testFileContent);
  });
});
