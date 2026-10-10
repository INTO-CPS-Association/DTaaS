# Library Microservice

The lib microservice serves the library assets of the DTaaS platform.
Clients use its API endpoints to list and fetch these assets.

This page explains how to use the library microservice.

The [assets](assets.md) page describes the suggested storage
conventions for library assets.

Assets stored in the library are available in the user workspace.

## Application Programming Interface (API)

The lib microservice provides services at
two endpoints:

**GraphQL API Endpoint:** `http://intocps.org/lib`

**HTTP Endpoint:** `http://intocps.org/lib/files`

### HTTP protocol

Endpoint: `localhost:PORT/lib/files`

Enable this endpoint with the `-H http.json` flag.
It provides the usual file upload and download options.

Sample screenshots:

![top-level](top-level.png)

![inside](inside.png)

### GraphQL protocol

Endpoint: `localhost:PORT/lib`

The `http://intocps.org/lib` URL opens a GraphQL playground.

The playground shows the query schema and lets you test sample queries.
Outside the playground, send GraphQL queries as HTTP POST requests.

The library microservice provides two API calls:

* List the contents of a directory
* Fetch a file

Both calls can be sent from the GraphQL playground or as plain HTTP
POST requests. The accepted queries are shown below.

### Provide list of contents for a directory

To list the files in a directory, use the following GraphQL query.

Replace the `path` value with the directory path.

Send requests to: <https://intocps.org/lib>

#### GraphQL query for list of contents

``` graphql
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

#### GraphQL response for list of contents

``` graphql
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

#### HTTP request for list of contents

``` http
POST /lib HTTP/1.1
Host: intocps.org
Content-Type: application/json
Content-Length: 388

{
  "query":"query {\n  listDirectory(path: \"user1\") {\n    repository {\n      tree {\n        blobs {\n          edges {\n            node {\n              name\n              type\n            }\n          }\n        }\n        trees {\n          edges {\n            node {\n              name\n              type\n            }\n          }\n        }\n      }\n    }\n  }\n}"
}
```

#### HTTP response for list of contents

``` http
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

This query takes a file path and returns the contents of the file.

To try this query, create a file `files/user2/data/welcome.txt`
containing `hello world`.

#### GraphQL query for fetch a file

``` graphql
query {
  readFile(path: "user2/data/welcome.txt") {
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

#### GraphQL response for fetch a file

``` graphql
{
  "data": {
    "readFile": {
      "repository": {
        "blobs": {
          "nodes": [
            {
              "name": "welcome.txt",
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

#### HTTP request for fetch a file

``` http
POST /lib HTTP/1.1
Host: intocps.org
Content-Type: application/json
Content-Length: 217
{
  "query":"query {\n  readFile(path: \"user2/data/welcome.txt\") {\n    repository {\n      blobs {\n        nodes {\n          name\n          rawBlob\n          rawTextBlob\n        }\n      }\n    }\n  }\n}"
}
```

#### HTTP response for fetch a file

``` http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Connection: close
Content-Length: 134
Content-Type: application/json; charset=utf-8
Date: Wed, 27 Sep 2023 09:17:18 GMT
X-Powered-By: Express
{"data":{"readFile":{"repository":{"blobs":{"nodes":[{"name":"welcome.txt","rawBlob":"hello world","rawTextBlob":"hello world"}]}}}}}
```

The _path_ is the file path to look at.
For example, _user1_ looks at the files of
**user1**, and _user1/functions_ looks at the contents of the
_functions/_ directory.
