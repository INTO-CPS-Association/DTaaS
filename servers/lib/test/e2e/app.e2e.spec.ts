import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { execSync } from "child_process";
import { AppModule } from "../../src/app.module";

describe("End to End test for the application", () => {
  let app: INestApplication;

  beforeAll(async () => {
    execSync("test/starttraefik.bash");

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init(); // Initialize the application
    await app.listen(process.env.PORT);

    await new Promise((resolve) => setTimeout(resolve, 4000));
  }, 10000);

  afterAll(async () => {
    execSync("test/stoptraefik.bash");
    await app.close();
  }, 10000);

  it("should return the filename corresponding to the directory given in the query through the Traefik gateway", async () => {
    const path = "user1";
    const query = `{
      listDirectory(path: "${path}")
    }`;

    const expectedResponse = {
      data: {
        listDirectory: [
          "README.md",
          "data",
          "digital twins",
          "functions",
          "models",
          "tools",
        ],
      },
    };

    const response = await request("http://localhost")
      .post(process.env.APOLLO_PATH)
      .send({ query });

    response;
    expect(response.body).toEqual(expectedResponse);
  }, 10000);

  it("should return the filename corresponding to the directory given in the query through the Traefik gateway", async () => {
    const path = "user1";
    const query = `{
      listDirectory(path: "${path}")
    }`;

    const expectedResponse = {
      data: {
        listDirectory: [
          "README.md",
          "data",
          "digital twins",
          "functions",
          "models",
          "tools",
        ],
      },
    };

    const response = await request("http://localhost")
      .post(process.env.APOLLO_PATH)
      .send({ query });

    response;
    expect(response.body).toEqual(expectedResponse);
  }, 10000);

  it("should return the filename corresponding to the directory given in the query through the Traefik gateway", async () => {
    const path = "user1";
    const query = `{
      listDirectory(path: "${path}")
    }`;

    const expectedResponse = {
      data: {
        listDirectory: [
          "README.md",
          "data",
          "digital twins",
          "functions",
          "models",
          "tools",
        ],
      },
    };

    const response = await request("http://localhost")
      .post(process.env.APOLLO_PATH)
      .send({ query });

    response;
    expect(response.body).toEqual(expectedResponse);
  }, 10000);

  it("should return the filename corresponding to the directory given in the query through the Traefik gateway", async () => {
    const path = "user1";
    const query = `{
      listDirectory(path: "${path}")
    }`;

    const expectedResponse = {
      data: {
        listDirectory: [
          "README.md",
          "data",
          "digital twins",
          "functions",
          "models",
          "tools",
        ],
      },
    };

    const response = await request("http://localhost")
      .post(process.env.APOLLO_PATH)
      .send({ query });

    expect(response.body).toEqual(expectedResponse);
  }, 10000);

  it("should return the filename corresponding to the directory given in the query through the Traefik gateway", async () => {
    const path = "user1";
    const query = `{
      listDirectory(path: "${path}")
    }`;

    const expectedResponse = {
      data: {
        listDirectory: [
          "README.md",
          "data",
          "digital twins",
          "functions",
          "models",
          "tools",
        ],
      },
    };

    const response = await request("http://localhost")
      .post(process.env.APOLLO_PATH)
      .send({ query });

    expect(response.body).toEqual(expectedResponse);
  }, 10000);

  it("should return the filename corresponding to the directory given in the query through the Traefik gateway", async () => {
    const path = "user1";
    const query = `{
      listDirectory(path: "${path}")
    }`;

    const expectedResponse = {
      data: {
        listDirectory: [
          "README.md",
          "data",
          "digital twins",
          "functions",
          "models",
          "tools",
        ],
      },
    };

    const response = await request("http://localhost")
      .post(process.env.APOLLO_PATH)
      .send({ query });

    response;
    expect(response.body).toEqual(expectedResponse);
  }, 10000);
});
