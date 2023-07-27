import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import GitlabFilesService from "../../src/files/services/gitlab-files.service";
import { pathToTestFileContent, testFileContent , MockConfigService, testDirectory } from "../testUtil";

describe("GitlabFilesService", () => {
  let filesService: GitlabFilesService;
  const mockConfigService = new MockConfigService();
  jest.mock("axios");

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
    jest.spyOn(axios, "post").mockResolvedValue({ data: testDirectory });

    const result = await filesService.listDirectory("user2");
    expect(result).toEqual(testDirectory);
  });

  it("should read file", async () => {
    jest
      .spyOn(axios, "post")
      .mockResolvedValue({ data: { data: testFileContent } });

    const result = await filesService.readFile(pathToTestFileContent);
    expect(result).toEqual(testFileContent);
  });
});
