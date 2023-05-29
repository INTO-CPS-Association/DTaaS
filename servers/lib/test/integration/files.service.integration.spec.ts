import { Test, TestingModule } from "@nestjs/testing";
import { FilesResolver } from "../../src/files/files.resolver";
import { FilesServiceFactory } from "../../src/files/services/files-service.factory";
import { LocalFilesService } from "../../src/files/services/local-files.service";
import { GitlabFilesService } from "../../src/files/services/gitlab-files.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
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
        ConfigService,
      ],
    }).compile();

    filesResolver = module.get<FilesResolver>(FilesResolver);
  });

  it("should list files and directories ", async () => {
    const result = await filesResolver.listDirectory(pathToTestDirectory);
    expect(result).toEqual(testDirectory);
  });

  it("should read file", async () => {
    const result = await filesResolver.readFile(pathToTestFileContent);
    expect(result).toEqual(testFileContent);
  });
});
