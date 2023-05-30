import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
<<<<<<<< HEAD:servers/lib/test/e2e/app.e2e.spec.ts
import { AppModule } from "../../src/app.module";
import { e2eDirectory, pathToTestDirectory } from "../testUtil";
========
import { execSync } from "child_process";
import { AppModule } from "../src/app.module";
>>>>>>>> 92ace14 (move traefik test, structure tests):servers/lib/test/app.e2e.spec.ts

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("End to End test for the application", () => {
  let app: INestApplication;

<<<<<<<< HEAD:servers/lib/test/e2e/app.e2e.spec.ts
  beforeAll(async () => {
========
  beforeEach(async () => {
    execSync("test/starttraefik.bash");

>>>>>>>> 92ace14 (move traefik test, structure tests):servers/lib/test/app.e2e.spec.ts
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.listen(process.env.PORT);
<<<<<<<< HEAD:servers/lib/test/e2e/app.e2e.spec.ts
  }, 10000);
  afterAll(async () => {
    await app.close();
========
    await sleep(5000);
  }, 10000);

  afterEach(async () => {
    await app.close();
    execSync("test/stoptraefik.bash");
>>>>>>>> 92ace14 (move traefik test, structure tests):servers/lib/test/app.e2e.spec.ts
  }, 10000);

  it("should return the filename corresponding to the directory given in the query", async () => {
    const query = `{
      getFiles(path: "${pathToTestDirectory}")

  }`;

    const expectedResponse = {
      data: {
        getFiles: e2eDirectory,
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
