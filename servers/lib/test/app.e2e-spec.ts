import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("End to End test for the application", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
      .post(process.env.APOLLO_PATH)
      .send({ query });
    expect(response.body).toEqual(expectedResponse);
  });
});
