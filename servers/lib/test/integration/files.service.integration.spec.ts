import { Test, TestingModule } from "@nestjs/testing";
import { FilesResolver } from "../../src/files/files.resolver";
import { FilesServiceFactory } from "../../src/files/services/files-service.factory";
import { LocalFilesService } from "../../src/files/services/local-files.service";
import { GitlabFilesService } from "../../src/files/services/gitlab-files.service";
import { ConfigModule } from "@nestjs/config";
import {
  pathToRealDirectory,
  pathToRealFileContent,
  readFileActualContent,
  testDirectory,
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

  //...

  describe("listDirectory", () => {
    it("should list files in local directory", async () => {
      process.env.MODE = "local";

      const files = await filesResolver.listDirectory(pathToRealDirectory);
      expect(files).toEqual(testDirectory);
    });

    it("should list files in GitLab repository", async () => {
      process.env.MODE = "gitlab";

      const files = await filesResolver.listDirectory(pathToRealDirectory);
      expect(files).toEqual(testDirectory);
    });
  });

  describe("readFile", () => {
    it("should read file in local directory", async () => {
      process.env.MODE = "local";

      const content = await filesResolver.readFile(pathToRealFileContent);
      expect(content).toEqual(readFileActualContent);
    });

    it("should read file in GitLab repository", async () => {
      process.env.MODE = "gitlab";

      const content = await filesResolver.readFile(pathToRealFileContent);
      expect(content).toEqual(readFileActualContent);
    });
  });
});
