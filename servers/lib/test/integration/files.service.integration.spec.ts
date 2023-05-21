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
  let configService: ConfigService;

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

    configService = module.get<ConfigService>(ConfigService);
    filesResolver = module.get<FilesResolver>(FilesResolver);
  });

  it("should list files and directories ", async () => {
    const result = await filesResolver.listDirectory(pathToTestDirectory);

    console.log(result);
    console.log(testDirectory);
    expect(result).toEqual(testDirectory);
  });

  it("should read file", async () => {
    const result = await filesResolver.readFile(pathToTestFileContent);
    console.log(result);
    console.log(testFileContent);
    expect(result).toEqual(testFileContent);
  });
});

/* describe("readFile", () => {
    it("should read file in local directory", async () => {
      process.env.MODE = "local";

      const content = await filesResolver.readFile(pathToRealFileContent);
      expect(content).toEqual(readFileActualContent);
    });

    it("should list files in GitLab repository", async () => {
      process.env.MODE = "gitlab";

      const files = await filesResolver.listDirectory(pathToRealDirectory);
      console.log(files);
      expect(files).toEqual(testDirectory);
    });
    
    it("should read file in GitLab repository", async () => {
      process.env.MODE = "gitlab";

      const content = await filesResolver.readFile(pathToRealFileContent);
      expect(content).toEqual(readFileActualContent);
    });
  }); */
