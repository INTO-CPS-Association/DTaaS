# Library Microservice

The lib microservice is responsible for handling and serving the contents of library assets of the DTaaS platform. It provides API endpoints for clients to query, and fetch these assets.

This document provides instructions for using the library microservice.

Please see [assets](/user/servers/lib/assets.md) for a suggested storage conventions of your library assets.

Once the assets are stored in the library, you can access the server's endpoint by typing in the following URL: `http://foo.com/lib`.

The URL opens a graphql playground. You can check the query schema and try sample queries here. You can also send graphql queries as HTTP POST requests and get responses.

## The GraphQL Queries

The library microservice services two graphql requests:

* Provide a list of contents for a directory
* Fetch a file from the available files

The format of the accepted queries are:

### Provide list of contents for a directory

```graphql
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

#### Fetch a file from the available files

```graphql
query {
  readFile(path: "/path/to/file") {
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

The _path_ refers to the file path to look at: For example, _user1_ looks at files of **user1**; _user1/functions_ looks at contents of _functions/_ directory.

## Example GraphQL Queries

### Provide list of contents for a directory

#### HTTP Request:

send the request to: http://foo.com:<PORT>/lib

```http
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

#### HTTP Response:

```http
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

#### HTTP Request:

send the request to: http://foo.com:<PORT>/lib

```http
POST /lib
Host: foo.com:<PORT>
Content-Type:application/json
User-Agent:Mozilla
Accept:*/*

{
"query":
  query{
    readFile(path:"user2/data/welcome.txt"){
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

#### HTTP Response:

```http
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
              "name": "welcome.txt",
              "rawBlob": "welcome user",
              "rawTextBlob": "welcome user"
            }
          ]
        }
      }
    }
  }
}

```
