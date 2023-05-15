import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "../../src/files/files.service";
import { FilesResolver } from "../../src/files/files.resolver";
import { files, path } from "../testUtil";

describe("Unit tests for FilesResolver", () => {
  let filesResolver: FilesResolver;

  const mockFilesService = {
    Wrapper: jest.fn(() => files),
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

  describe("listDirectory", () => {
    it("should be defined", () => {
      expect(filesResolver.listDirectory).toBeDefined();
    });

    it("should return the filenames in the given directory", async () => {
      const result = await filesResolver.listDirectory(path);

      expect(result).toEqual(files);
    });
  });
});
