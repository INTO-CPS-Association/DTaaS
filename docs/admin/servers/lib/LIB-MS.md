# Host Library Microservice

The **lib microservice** is a simplified file manager providing graphQL API.
It has three features:

* provide a listing of directory contents.
* transfer a file to user.
* Source files can either come from local file system or from a gitlab instance.

The library microservice is designed to manage and serve files, functions, and models to users, allowing them to access and interact with various resources.

This document provides instructions for running a stand alone library microservice.

## Setup the File System

The users expect the following file system structure for their reusable assets.

![File System Layout](file-system-layout.png)

There is a skeleton file structure in [DTaaS codebase](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/files). You can copy and create file system for your users.

## Gitlab setup (optional)

For this microserivce to be functional,
a certain directory or gitlab project structure is expected.
The microservice expects that the gitlab consisting of one group,
DTaaS, and within that group, all of the projects be located,
**user1**, **user2**, ... , as well as a **commons** project.
Each project corresponds to files of one user.
A sample file structure can be seen in [gitlab dtaas group](https://gitlab.com/dtaas).
You can visit the gitlab documentation on [groups](https://docs.gitlab.com/ee/user/group/)
for help on the management of gitlab groups.

You can clone the git repositories from the `dtaas` group
to get a sample file system structure for the lib microservice.

## Setup Microservice

To set up the lib microservice, follow these steps:

Download the **lib-microservice.zip** from the [releases page](https://github.com/INTO-CPS-Association/DTaaS/releases).

## Configuration setup

The microservices uses `.env` environment files to receive configuration.

To set up the environment variables for the lib microservice,
create a new file named _.env_ in the `lib-ms` directory.
Then, add the following variables and their respective values.
Below you can see and how, with included examples:

```ini
PORT='4001'
MODE='local' or 'gitlab'
LOCAL_PATH='/Users/<Username>/DTaaS/files'
GITLAB_GROUP='dtaas'
GITLAB_URL='https://gitlab.com/api/graphql'
TOKEN='123-sample-token'
LOG_LEVEL='debug'
APOLLO_PATH='/lib' or ''
GRAPHQL_PLAYGROUND='false' or 'true'
```

The `LOCAL_PATH` variable is the absolute filepath to the
location of the local directory which will be served to users
by the Library microservice.

The `GITLAB_URL`, `GITLAB_GROUP` and `TOKEN` are only relevant for `gitlab` mode.
The `TOKEN` should be set to your GitLab Group access API token.
For more information on how to create and use your access token,
[gitlab page](https://docs.gitlab.com/ee/user/group/settings/group_access_tokens.html).

Once you've generated a token, copy it and replace
the value of `TOKEN` with your token for the gitlab group, can be found.

Replace the default values the appropriate values for your setup.

**NOTE**:

1. When \__MODE=local_, only _LOCAL_PATH_ is used. Other environment variables are unused.
1. When _MODE=gitlab_, _GITLAB_URL, TOKEN_, and _GITLAB_GROUP_ are used; _LOCAL_PATH_ is unused.

### Start Microservice

```bash
yarn install    # Install dependencies for the microservice
yarn build      # build the application
yarn start      # start the application
```

You can press `Ctl+C` to halt the application.
If you wish to run the microservice in the background, use

```bash
nohup yarn start & disown
```

The lib microservice is now running and ready to serve files, functions, and models.

Users can access the library microservice at URL: `http://localhost:<PORT>/lib`.

## Service Endpoint

The URL endpoint for this microservice is located at: `localhost:PORT/lib`

## GraphQL API Calls

The lib microservice supports two GraphQL queries.

### Directory Listing

#### Query

To retrieve a list of files in a directory, use the following GraphQL query.
Replace `path` with the desired directory path.

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

#### Response

This query returns the list of files and subdirectories in the specified directory.
The response will include the name and type of each item.

```graphql
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

### Fetching a File

#### Query

This query receives directory path and send the file contents to user in response.

To check this query, create a file `files/user2/data/welcome.txt`
with content of `hello world`.

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

#### Response

This query returns the name, raw binary blob, and raw text blob of
the specified file. The `rawBlob` field contains the file contents
in binary format, while the `rawTextBlob` field contains the file contents
as plain text.

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
Body: <<copy the json code from example>>
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
