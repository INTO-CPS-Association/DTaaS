import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { expectedResponse } from "test/testUtil";

describe("End to End test for the application", () => {
  it("should return the filename corresponding to the directory given in the query through the Traefik gateway", async () => {
    const query = `query {
      listDirectory(path:"user2")
      {
        repository{
          tree{
            trees{
              edges{
                node{
                  name
                  
                }
              }
            }
          }
        }
      }
    }`;

    const response = await request("http://localhost")
      .post("/lib")
      .send({ query });

    response;
    expect(response.body).toEqual(expectedResponse);
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

    const expectedResponse = {
      data: {
        readFile: {
          repository: {
            blobs: {
              nodes: [
                {
                  name: "README.md",
                  rawBlob: "content123",
                  rawTextBlob: "content123",
                },
              ],
            },
          },
        },
      },
    };

    const response = await request("http://localhost")
      .post("/lib")
      .send({ query });

    response;
    expect(response.body).toEqual(expectedResponse);
  }, 10000);
});
