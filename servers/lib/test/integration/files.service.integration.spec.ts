import { Test, TestingModule } from "@nestjs/testing";
import { FilesResolver } from "../../src/files/files.resolver";
import { FilesServiceFactory } from "../../src/files/services/files-service.factory";
import { LocalFilesService } from "../../src/files/services/local-files.service";
import { GitlabFilesService } from "../../src/files/services/gitlab-files.service";
import { ConfigModule } from "@nestjs/config";
import {
  pathToTestDirectory,
  pathToTestFileContent,
  testDirectory,
  testFileContent,
} from "../testUtil";

describe("Integration tests for FilesResolver", () => {
  let filesResolver: FilesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        FilesResolver,
        FilesServiceFactory,
        LocalFilesService,
        GitlabFilesService,
      ],
    }).compile();

    filesResolver = module.get<FilesResolver>(FilesResolver);
  });

  it("should be defined", () => {
    expect(filesResolver).toBeDefined();
  });

  describe("listDirectory", () => {
    it("should list files", async () => {
      const files = await filesResolver.listDirectory(pathToTestDirectory);
      expect(files).toEqual(testDirectory);
    });
  });

  describe("readFile", () => {
    it("should read file", async () => {
      const content = await filesResolver.readFile(pathToTestFileContent);
      expect(content).toEqual(testFileContent);
    });
  });
});
