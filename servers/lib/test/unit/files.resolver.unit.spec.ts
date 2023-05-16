import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "../../src/files/files.service";
import { FilesResolver } from "../../src/files/files.resolver";
import {
  testDirectory,
  pathToTestDirectory,
  pathToTestFileContent,
  testFileContent,
} from "../testUtil";

describe("Unit tests for FilesResolver", () => {
  let filesResolver: FilesResolver;
  let mockFilesService;

  beforeEach(async () => {
    mockFilesService = {
      Wrapper: jest.fn(),
    };

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

  describe("listDirectory", () => {
    it("should be defined", () => {
      expect(filesResolver.listDirectory).toBeDefined();
    });

    it("should return the result from the FilesService", async () => {
      mockFilesService.Wrapper.mockResolvedValue(testDirectory);

      const result = await filesResolver.listDirectory(pathToTestDirectory);
      expect(mockFilesService.Wrapper).toHaveBeenCalledWith(
        "listDirectory",
        pathToTestDirectory
      );
      expect(result).toEqual(testDirectory);
    });
  });

  describe("readFile", () => {
    it("should be defined", () => {
      expect(filesResolver.readFile).toBeDefined();
    });

    it("should return the result from the FilesService", async () => {
      mockFilesService.Wrapper.mockResolvedValue(testFileContent);
      const result = await filesResolver.readFile(pathToTestFileContent);
      expect(mockFilesService.Wrapper).toHaveBeenCalledWith(
        "readFile",
        pathToTestFileContent
      );
      expect(result).toEqual(testFileContent);
    });
  });
});
