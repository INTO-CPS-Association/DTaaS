import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "../../src/files/files.service";
import { FilesResolver } from "../../src/files/files.resolver";
import { pathToTestDirectory, testDirectory } from "../testUtil";

describe("Unit tests for FilesResolver", () => {
  let filesResolver: FilesResolver;

  const mockFilesService = {
    Wrapper: jest.fn(() => testDirectory),
    getLocalFiles: jest.fn(() => testDirectory),
    getGitlabFiles: jest.fn(() => testDirectory),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FilesResolver, FilesService],
    })
      .overrideProvider(FilesService)
      .useValue(mockFilesService)
      .compile();

    filesResolver = module.get<FilesResolver>(FilesResolver);
  });

  it("should be defined", () => {
    expect(filesResolver).toBeDefined();
  });

  describe("getFiles", () => {
    it("should be defined", () => {
      expect(filesResolver.getFiles).toBeDefined();
    });

    it("should list files in directory", async () => {
      const result = await filesResolver.getFiles(pathToTestDirectory);
      expect(result).toEqual(testDirectory);
    });
  });
});
