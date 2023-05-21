import { Test, TestingModule } from "@nestjs/testing";
import { FilesResolver } from "../../src/files/files.resolver";
import { FilesServiceFactory } from "../../src/files/services/files-service.factory";
import { LocalFilesService } from "../../src/files/services/local-files.service";
import { GitlabFilesService } from "../../src/files/services/gitlab-files.service";
import { ConfigModule } from "@nestjs/config";
import {
  pathToRealDirectory,
  pathToRealFileContent,
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
    it("should list files in local directory", async () => {
      const files = await filesResolver.listDirectory(pathToRealDirectory);
      expect(files).toEqual(testDirectory);
    });

    it("should list files in GitLab repository", async () => {
      const files = await filesResolver.listDirectory(pathToRealDirectory);
      expect(files).toEqual(testDirectory);
    });
  });

  describe("readFile", () => {
    it("should read file in local directory", async () => {
      const content = await filesResolver.readFile(pathToRealFileContent);
      expect(content).toEqual(testFileContent);
    });

    it("should read file in GitLab repository", async () => {
      const content = await filesResolver.readFile(pathToRealFileContent);
      expect(content).toEqual(testFileContent);
    });
  });
});
