import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { pathToTestDirectory, testDirectory } from "../testUtil";

describe("End to End test for the application", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.listen(process.env.PORT);
  }, 10000);
  afterAll(async () => {
    await app.close();
  }, 10000);

  it("should return the filename corresponding to the directory given in the query", async () => {
    const query = `{
      getFiles(path: "${pathToTestDirectory}")

  }`;

    const expectedResponse = {
      data: {
        getFiles: testDirectory,
      },
    };

    const response = await request(app.getHttpServer())
      .post(process.env.APOLLO_PATH)
      .send({ query });
    expect(response.body).toEqual(expectedResponse);
  });
});
