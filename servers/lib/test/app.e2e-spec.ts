import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { ConfigService } from "@nestjs/config";

describe("App (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const configService = app.get(ConfigService);
    const port = configService.get<number>("PORT_TEST");
    const mode = configService.get<string>("MODE");
    await app.init();
  });

  it("should return the filename corresponding to the directory given in the query", async () => {
    const path = "user1";
    const query = `{
      getFiles(path: "${path}")
  }`;

    const expectedResponse = {
      data: {
        getFiles: ["data", "digital twins", "functions", "models", "tools"],
      },
    };

    const response = await request(app.getHttpServer())
      .post("/graphql")
      .send({ query });
    expect(response.body).toEqual(expectedResponse);
  });

  afterAll(async () => {
    await app.close();
  });
});
