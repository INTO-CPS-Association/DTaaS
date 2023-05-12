import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { execSync } from "child_process";

describe("End to End test for the application", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(process.env.PORT);
  });

  afterEach(async () => {
    await app.close();
    execSync("test/stoptraefik.bash");
  }, 10000);

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

  it("should return the filename corresponding to the directory given in the query through the Traefik gateway", async () => {
    const path = "user1";
    const query = `{
      getFiles(path: "${path}")
    }`;

    const expectedResponse = {
      data: {
        getFiles: ["data", "digital twins", "functions", "models", "tools"],
      },
    };

    const response = await request("http://localhost")
      .post(process.env.APOLLO_PATH)
      .send({ query });
    expect(response.body).toEqual(expectedResponse);
  });
});
