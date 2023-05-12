import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "../../src/files/files.service";
import { FilesResolver } from "../../src/files/files.resolver";

describe("Unit tests for FilesResolver", () => {
  let filesResolver: FilesResolver;

  const mockFilesService = {
    Wrapper: jest.fn(() => [
      "digital twins",
      "functions",
      "data",
      "tools",
      "models",
    ]),
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

    it("should return the filenames in the given directory", async () => {
      const files = ["digital twins", "functions", "data", "tools", "models"];
      const path = "user1";
      const result = await filesResolver.getFiles(path);

      expect(result).toEqual(files);
    });
  });
});
