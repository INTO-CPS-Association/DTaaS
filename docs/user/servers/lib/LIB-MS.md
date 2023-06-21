# Library Microservice

:fontawesome-solid-circle-info: **The library microservice provides an API interface to reusable assets library. This is only for expert users who need to integrate the DTaaS with their own IT systems. Regular users can safely skip this page.**


The lib microservice is responsible for handling and serving the contents of library assets of the DTaaS platform. It provides API endpoints for clients to query, and fetch these assets.

This document provides instructions for using the library microservice.

Please see [assets](assets.md) for a suggested storage conventions of your library assets.

Once the assets are stored in the library, you can access the server's endpoint by typing in the following URL: `http://foo.com/lib`.

The URL opens a graphql playground. You can check the query schema and try sample queries here. You can also send graphql queries as HTTP POST requests and get responses.

## The GraphQL Queries

The library microservice services two graphql requests:

* Provide a list of contents for a directory
* Fetch a file from the available files

The format of the accepted queries are:

### Provide list of contents for a directory

send requests to: https://foo.com/lib

=== "GraphQL Query"

    ``` graphql-query
    query {
      listDirectory(path: "user1") {
        repository {
          tree {
            blobs {
              edges {
                node {
                  name
                  type
                }
              }
            }
            trees {
              edges {
                node {
                  name
                  type
                }
              }
            }
          }
        }
      }
    }
    ```

=== "GraphQL Response"

    ``` graphql-response
    {
      "data": {
        "listDirectory": {
          "repository": {
            "tree": {
              "blobs": {
                "edges": []
              },
              "trees": {
                "edges": [
                  {
                    "node": {
                      "name": "common",
                      "type": "tree"
                    }
                  },
                  {
                    "node": {
                      "name": "data",
                      "type": "tree"
                    }
                  },
                  {
                    "node": {
                      "name": "digital twins",
                      "type": "tree"
                    }
                  },
                  {
                    "node": {
                      "name": "functions",
                      "type": "tree"
                    }
                  },
                  {
                    "node": {
                      "name": "models",
                      "type": "tree"
                    }
                  },
                  {
                    "node": {
                      "name": "tools",
                      "type": "tree"
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
    ```

=== "HTTP Request :warning:"

    ``` http-request
    POST /lib
    Host: foo.com:<PORT>
    Content-Type:application/json
    User-Agent:Mozilla
    Accept:_/_

    query {
      listDirectory(path: "user2") {
        repository {
          tree {
            blobs {
              edges {
                node {
                  name

                }
              }
            }
            trees {
              edges {
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
    ```

=== "HTTP Response :warning:"

    ``` http-response
    200 OK
    access-control-allow-origin: \*
    connection: keep-alive
    content-length: 76
    content-type: application/json; charset=utf-8
    date: Mon, 15 May 2023 10:13:37 GMT
    etag: ................
    keep-alive: timeout=5
    x-powered-by: Express

    {
      "data": {
        "listDirectory": {
          "repository": {
            "tree": {
              "blobs": {
                  "edges": []
              },
            "trees": {
                "edges": [
                  {
                    "node": {
                        "name": "data"
                    }
                  },
                  {
                    "node": {
                        "name": "digital twins"
                      }
                  },
                  {
                    "node": {
                        "name": "functions"
                    }
                  },
                  {
                    "node": {
                        "name": "models"
                    }
                  },
                  {
                    "node": {
                        "name": "tools"
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }

    ```


### Fetch a file from the available files



=== "GraphQL Request"

    ```graphql-request
    query {
      readFile(path: "user2/data/sample.txt") {
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
    }
    ```

=== "GraphQL Response"

    ```graphql-response
    {
      "data": {
        "readFile": {
          "repository": {
            "blobs": {
              "nodes": [
                {
                  "name": "sample.txt",
                  "rawBlob": "hello world",
                  "rawTextBlob": "hello world"
                }
              ]
            }
          }
        }
      }
    }
    ```

=== "HTTP Request :warning:"

    ```http-request
    POST /lib
    Host: foo.com:<PORT>
    Content-Type:application/json
    User-Agent:Mozilla
    Accept:*/*

    {
    "query":
      query{
        readFile(path:"user2/data/sample.txt"){
          repository{
            blobs{
              nodes{
                name
                rawBlob
                rawTextBlob
              }
            }
          }
        }
      }
    }
    ```

=== "HTTP Response :warning:"

    ```http-response
    200 OK
    access-control-allow-origin: *
    connection: keep-alive
    content-length: 76
    content-type: application/json; charset=utf-8
    date: Mon, 15 May 2023 10:13:37 GMT
    etag: ................
    keep-alive: timeout=5
    x-powered-by: Express

    {
      "data": {
        "readFile": {
          "repository": {
            "blobs": {
              "nodes": [
                {
                  "name": "sample.txt",
                  "rawBlob": "welcome hello world",
                  "rawTextBlob": "hello world"
                }
              ]
            }
          }
        }
      }
    }

    ```


The _path_ refers to the file path to look at: For example, _user1_ looks at files of **user1**; _user1/functions_ looks at contents of _functions/_ directory.
