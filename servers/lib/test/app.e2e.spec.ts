import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
<<<<<<<< HEAD:servers/lib/test/e2e/app.e2e.spec.ts
import { AppModule } from "../../src/app.module";
========
import { execSync } from "child_process";
import { AppModule } from "../src/app.module";
>>>>>>>> 58031e2 (move traefik test, structure tests):servers/lib/test/app.e2e.spec.ts

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("End to End test for the application", () => {
  let app: INestApplication;

  beforeEach(async () => {
    execSync("test/starttraefik.bash");

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(process.env.PORT);
<<<<<<<< HEAD:servers/lib/test/e2e/app.e2e.spec.ts
========
    await sleep(5000);
>>>>>>>> 58031e2 (move traefik test, structure tests):servers/lib/test/app.e2e.spec.ts
  }, 10000);

  afterEach(async () => {
    await app.close();
<<<<<<<< HEAD:servers/lib/test/e2e/app.e2e.spec.ts
========
    execSync("test/stoptraefik.bash");
>>>>>>>> 58031e2 (move traefik test, structure tests):servers/lib/test/app.e2e.spec.ts
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
