import { Test, TestingModule } from "@nestjs/testing";
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

  it("should return the filename corresponding to the directory given in the query", async () => {});
});
