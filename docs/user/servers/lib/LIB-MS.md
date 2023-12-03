# Library Microservice

:fontawesome-solid-circle-info: **The library microservice provides**
**an API interface to reusable assets library.**
**This is only for expert users who need to integrate the DTaaS**
**with their own IT systems. Regular users can safely skip this page.**

The lib microservice is responsible for handling and serving
the contents of library assets of the DTaaS platform.
It provides API endpoints for clients to query, and fetch these assets.

This document provides instructions for using the library microservice.

Please see [assets](assets.md) for a suggested storage
conventions of your library assets.

Once the assets are stored in the library,
you can access the server's endpoint by typing
in the following URL: `http://foo.com/lib`.

The URL opens a graphql playground.
You can check the query schema and try sample queries here.
You can also send graphql queries as HTTP POST requests and get responses.

## API Queries

The library microservice services two API calls:

* Provide a list of contents for a directory
* Fetch a file from the available files

The API calls are accepted over GraphQL and HTTP API end points.
The format of the accepted queries are:

### Provide list of contents for a directory

To retrieve a list of files in a directory, use the following GraphQL query.

Replace `path` with the desired directory path.

send requests to: <https://foo.com/lib>

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

=== "HTTP Request"

    ``` http-request
    POST /lib HTTP/1.1
    Host: foo.com
    Content-Type: application/json
    Content-Length: 388

    {
      "query":"query {\n  listDirectory(path: \"user1\") {\n    repository {\n      tree {\n        blobs {\n          edges {\n            node {\n              name\n              type\n            }\n          }\n        }\n        trees {\n          edges {\n            node {\n              name\n              type\n            }\n          }\n        }\n      }\n    }\n  }\n}"
    }

    ```

=== "HTTP Response"

    ``` http-response
    HTTP/1.1 200 OK
    Access-Control-Allow-Origin: *
    Connection: close
    Content-Length: 306
    Content-Type: application/json; charset=utf-8
    Date: Tue, 26 Sep 2023 20:26:49 GMT
    X-Powered-By: Express
    {"data":{"listDirectory":{"repository":{"tree":{"blobs":{"edges":[]},"trees":{"edges":[{"node":{"name":"data","type":"tree"}},{"node":{"name":"digital twins","type":"tree"}},{"node":{"name":"functions","type":"tree"}},{"node":{"name":"models","type":"tree"}},{"node":{"name":"tools","type":"tree"}}]}}}}}}
    ```

### Fetch a file from the available files

This query receives directory path and send the file contents to user in response.

To check this query, create a file `files/user2/data/welcome.txt`
with content of `hello world`.

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

=== "HTTP Request"

    ```http-request
    POST /lib HTTP/1.1
    Host: foo.com
    Content-Type: application/json
    Content-Length: 217
    {
      "query":"query {\n  readFile(path: \"user2/data/welcome.txt\") {\n    repository {\n      blobs {\n        nodes {\n          name\n          rawBlob\n          rawTextBlob\n        }\n      }\n    }\n  }\n}"
    }
    ```

=== "HTTP Response"

    ```http-response
    HTTP/1.1 200 OK
    Access-Control-Allow-Origin: *
    Connection: close
    Content-Length: 134
    Content-Type: application/json; charset=utf-8
    Date: Wed, 27 Sep 2023 09:17:18 GMT
    X-Powered-By: Express
    {"data":{"readFile":{"repository":{"blobs":{"nodes":[{"name":"welcome.txt","rawBlob":"hello world","rawTextBlob":"hello world"}]}}}}}
    ```

The _path_ refers to the file path to look at:
For example, _user1_ looks at files of
**user1**; _user1/functions_ looks at contents of _functions/_ directory.
