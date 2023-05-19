import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { execSync } from "child_process";
import { AppModule } from "../../src/app.module";
import { pathToTestDirectory, pathToTestFileContent, testDirectory } from "../testUtil";

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
    const query = `{
      listDirectory(path: "${pathToTestDirectory}")
    }`;

    const expectedResponse = {
      data: {
        listDirectory: [
          "Test-README.md",
          "Test-Data",
          "Test-Digital Twins",
          "Test-Functions",
          "Test-Models",
          "Test-Tools"
        ]
      }

    };

    const response = await request("http://localhost")
      .post(process.env.APOLLO_PATH)
      .send({ query });

    response;
    expect(response.body).toEqual(expectedResponse);
  }, 10000);

  it("should return the content of a file given in the query through the Traefik gateway", async () => {
    const query = `{
      readFile(path: "${pathToTestFileContent}")
    }`;

    const expectedResponse = {
      data: {
        readFile: [
          "testcontent123"
        ]
      }

    };

    const response = await request("http://localhost")
      .post(process.env.APOLLO_PATH)
      .send({ query });

    response;
    expect(response.body).toEqual(expectedResponse);
  }, 10000);
});