import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { FilesModule } from "../../src/files/files.module";
import { GraphQLModule } from "@nestjs/graphql";
import { FilesService } from "../../src/files/files.service";
import { ConfigService } from "@nestjs/config";
import * as dotenv from "dotenv";
import { files, localFiles, path } from "../testUtil";
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

  it("ensure that the getLocalFiles method of the FilesService class returns the expected array of file names when called with a specific path in local mode", async () => {
    jest
      .spyOn(filesService, "getLocalFiles")
      .mockReturnValue(Promise.resolve(localFiles));
    const result = await filesService.getLocalFiles(path);
    expect(result).toEqual(localFiles);
  });

  it("ensure that the getGitlabFiles method of the FilesService class returns the expected array of file names when called with a specific path in Gitlab mode", async () => {
    jest
      .spyOn(filesService, "getGitlabFiles")
      .mockReturnValue(Promise.resolve(files));
    const result = await filesService.getGitlabFiles(path);
    expect(result).toEqual(files);
  });

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
  });
});
