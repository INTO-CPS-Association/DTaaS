import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { FilesModule } from "../../src/files/files.module";
import { GraphQLModule } from "@nestjs/graphql";
import { FilesService } from "../../src/files/files.service";
import { ConfigService } from "@nestjs/config";
import * as dotenv from "dotenv";
import { getApolloDriverConfig } from "../../util";
import { pathToTestDirectory, testDirectory } from "../testUtil";

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
  }, 10000);

  afterAll(async () => {
    await app.close();
  }, 10000);

  it("ensure that the getFiles method of the FilesService class returns the expected array of file names when called with a specific path", async () => {
    jest
      .spyOn(filesService, "Wrapper")
      .mockReturnValue(Promise.resolve(testDirectory));

    const query = `{
      getFiles(path: "${pathToTestDirectory}")
    }`;

    const variables = { pathToTestDirectory };


    const response = await request(app.getHttpServer())
      .post(process.env.APOLLO_PATH)
      .send({ query, variables });

    expect(response.body).toBeDefined();
    expect(response.body.data).toBeDefined();
    expect(response.body.data.getFiles).toEqual(testDirectory);

  });
});
