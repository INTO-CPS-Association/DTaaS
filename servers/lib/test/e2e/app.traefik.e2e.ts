import * as request from "supertest";
import {
  e2equery,
  expectedFileContentResponse,
  expectedListDirectoryResponse,
} from "../../test/testUtil";
import e from "express";

describe("End to End test for the application", () => {
  it("should return the filename corresponding to the directory given in the query through the Traefik gateway", async () => {
    const query = e2equery;

    const response = await request("http://localhost")
      .post("/lib")
      .send({ query });

    response;
    expect(response.body).toEqual(expectedListDirectoryResponse);
  }, 10000);

  it("should return the content of a file given in the query through the Traefik gateway", async () => {
    const query = `query {
      readFile(path:"user2/tools/README.md") {
        repository {
          blobs {
            nodes {
              name
              rawBlob
              rawTextBlob
            }
          }
        }
      }
    }`;

    const response = await request("http://localhost")
      .post("/lib")
      .send({ query });

    response;
    expect(response.body).toEqual(expectedFileContentResponse);
  }, 10000);
});
