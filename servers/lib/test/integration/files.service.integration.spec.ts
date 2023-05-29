import { Test, TestingModule } from "@nestjs/testing";
<<<<<<< HEAD
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
=======
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { FilesModule } from "../../src/files/files.module";
import { GraphQLModule } from "@nestjs/graphql";
import { FilesService } from "../../src/files/files.service";
import { ConfigService } from "@nestjs/config";
import * as dotenv from "dotenv";
import { localFiles, path } from "../testUtil";
import { getApolloDriverConfig } from "../../util";
dotenv.config({ path: ".env" });

describe("Integration Tests", () => {
  let app: INestApplication;
  let filesService: FilesService;

  beforeEach(async () => {
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
  }, 10000);

  afterEach(async () => {
    await app.close();
  }, 10000);

  it("ensure that the getFiles method of the FilesService class returns the expected array of file names when called with a specific path", async () => {
    jest
      .spyOn(filesService, "Wrapper")
      .mockReturnValue(Promise.resolve(localFiles));

    const query = `{
      getFiles(path: "${path}")
    }`;

    const variables = { path };

    const response = await request(app.getHttpServer())
      .post(process.env.APOLLO_PATH)
      .send({ query, variables });

    expect(response.body).toBeDefined();
    expect(response.body.data).toBeDefined();
    expect(response.body.data.getFiles).toEqual(localFiles);
>>>>>>> 79c8399 (  Adds traefik support for lib microservice (#54))
  });
});
