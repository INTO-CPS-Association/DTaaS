import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { FilesModule } from "../../src/files/files.module";
import { GraphQLModule } from "@nestjs/graphql";
import { FilesService } from "../../src/files/interfaces/files.service.interface";
import { ConfigService } from "@nestjs/config";
import * as dotenv from "dotenv";
import {
  pathToDirectory,
  directory,
  pathToFileContent,
  fileContent,
} from "../testUtil";
import { getApolloDriverConfig } from "../../util";
dotenv.config({ path: ".env" });

describe("Integration Tests", () => {
  let app: INestApplication;
  let filesService: FilesService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot(getApolloDriverConfig()), // use your function
        FilesModule,
      ],
      providers: [FilesService, ConfigService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    filesService = moduleFixture.get<FilesService>(FilesService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("listGitlabDirectory", () => {
    it("should be defined", () => {
      expect(filesService).toBeDefined();
    });

    it("should return the filenames in the given directory", async () => {
      const result = await filesService.listGitlabDirectory(pathToDirectory);

      expect(result.sort()).toEqual(directory.sort());
    });

    it("should throw an error if response from GitLab API is invalid", async () => {
      const expected = ["Invalid query"];
      const path = "invalid_path";
      const result = await filesService.listGitlabDirectory(path);
      expect(result).toEqual(expected);
    });
  });

  describe("readGitlabFile", () => {
    it("should be defined", () => {
      expect(filesService).toBeDefined();
    });

    it("should return the content of the file", async () => {
      const result = await filesService.readGitlabFile(pathToFileContent);
      expect(result).toEqual([fileContent]);
    });

    it("should throw an error if response from GitLab API is invalid", async () => {
      const expected = ["Invalid query"];
      const path = "invalid_path";
      const result = await filesService.readGitlabFile(path);
      expect(result).toEqual(expected);
    });
  });
});
