# Overview

## GraphQL API Calls

The lib microservice takes two distinct GraphQL queries.

### Directory Listing

This query receives directory path and provides list of files
in that directory. A sample query and response are given here.

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

### Fetch a File

This query receives directory path and send the file contents to user in response.

To check this query, create a file `files/user2/data/welcome.txt`
with content of `hello world`.

A sample query and response are given here.

```graphql
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

```graphql
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

## HTTP API Calls

The lib microservice also supports making API calls using HTTP POST requests.
Simply send a POST request to the URL endpoint with the GraphQL query in
the request body. Make sure to set the Content-Type header to
"application/json".

The easiest way to perform HTTP requests is to use
[HTTPie](https://github.com/httpie/desktop/releases) desktop application.
You can download the Ubuntu AppImage and run it. Select the following options:

```txt
Method: POST
URL: localhost:4001
Body: <<copy the json code from examples below>>
Content Type: text/json
```

Here are examples of the HTTP requests and responses for the HTTP API calls.

### Directory listing

```http
POST /lib HTTP/1.1
Host: localhost:4001
Content-Type: application/json
Content-Length: 388
{
   "query":"query {\n  listDirectory(path: \"user1\") {\n    repository {\n      tree {\n        blobs {\n          edges {\n            node {\n              name\n              type\n            }\n          }\n        }\n        trees {\n          edges {\n            node {\n              name\n              type\n            }\n          }\n        }\n      }\n    }\n  }\n}"
}
```

This HTTP POST request will generate the following HTTP response message.

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Connection: close
Content-Length: 306
Content-Type: application/json; charset=utf-8
Date: Tue, 26 Sep 2023 20:26:49 GMT
X-Powered-By: Express
{"data":{"listDirectory":{"repository":{"tree":{"blobs":{"edges":[]},"trees":{"edges":[{"node":{"name":"data","type":"tree"}},{"node":{"name":"digital twins","type":"tree"}},{"node":{"name":"functions","type":"tree"}},{"node":{"name":"models","type":"tree"}},{"node":{"name":"tools","type":"tree"}}]}}}}}}
```

### Fetch a file

This query receives directory path and send the file contents to user in response.

To check this query, create a file `files/user2/data/welcome.txt`
with content of `hello world`.

```http
POST /lib HTTP/1.1
Host: localhost:4001
Content-Type: application/json
Content-Length: 217
{
   "query":"query {\n  readFile(path: \"user2/data/welcome.txt\") {\n    repository {\n      blobs {\n        nodes {\n          name\n          rawBlob\n          rawTextBlob\n        }\n      }\n    }\n  }\n}"
}
```

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Connection: close
Content-Length: 134
Content-Type: application/json; charset=utf-8
Date: Wed, 27 Sep 2023 09:17:18 GMT
X-Powered-By: Express
{"data":{"readFile":{"repository":{"blobs":{"nodes":[{"name":"welcome.txt","rawBlob":"hello world","rawTextBlob":"hello world"}]}}}}}
```
