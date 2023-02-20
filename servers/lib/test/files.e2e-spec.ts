import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { FilesModule } from "../src/files/files.module";
import { GraphQLModule } from "@nestjs/graphql";
import { join } from "path";
import { FilesResolver } from "../src/files/files.resolver";
import { FilesService } from "../src/files/files.service";
import { ApolloDriver } from "@nestjs/apollo";
import { ConfigService } from "@nestjs/config";

describe("FilesResolver (e2e)", () => {
  let app: INestApplication;
  let filesService: FilesService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot({
          driver: ApolloDriver,
          autoSchemaFile: join(process.cwd(), "src/schema.gql"),
          debug: false,
          playground: true,
        }),
        FilesModule,
      ],
      providers: [FilesResolver, FilesService, ConfigService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    filesService = moduleFixture.get<FilesService>(FilesService);
  });

  it("should return an array of file names for a given path", async () => {
    const path = "test_directory";
    const expectedFiles = ["file1.txt", "file2.txt"];

    // Mock the getFilesInDirectory method of the filesService to return the expected array of files
    jest
      .spyOn(filesService, "getLocalFiles")
      .mockReturnValue(Promise.resolve(expectedFiles));

    // Make a GraphQL query to the getFiles query with a path argument
    const query = `{
        getFiles(path: "${path}")
    }`;

    const variables = { path };
    const response = await request(app.getHttpServer())
      .post("/graphql")
      .send({ query, variables });

    // Expect the response data to be equal to the expected array of files
    expect(response.body).toBeDefined();
    expect(response.body.data).toBeDefined();
    expect(response.body.data.getFiles).toEqual(expectedFiles);
  });

  afterAll(async () => {
    await app.close();
  });
});
