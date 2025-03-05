# Overview

The **lib microservice** is a simplified file manager which serves files
from local file system or public git repositories. It is possible to

* Upload and download files from web browser
* Query available files and download them using GraphQL API
* Clone public git repositories and serve them as local files

## Use in Docker Environment

### Create Docker Compose File

Create an empty file named `compose.lib.yml` and copy
the following into the file:

```yml
services:
  libms:
    image: intocps/libms:latest
    restart: unless-stopped
    volumes:
      - ./libms.yaml:/dtaas/libms/libms.yaml
      - ./files:/dtaas/libms/files
    ports:
      - "4001:4001"
```

### Create Files Directory (optional)

The **libms microservice** serves files available from
`files` directory.
So, create a directory named `files` with the following structure:

```text
files/
  data/
  digital_twins/
  functions/
  models/
  tools/
  common/
    data/
    functions/
    models/
    tools/
```

Please create this `files` directory
in the same file system location as that of the `compose.lib.yml` file.

:label: The directory structure is optional if you are using
libms as a standalone service.

## :gear: Configure

The microservices requires config specified in `libms.yaml` file.
The template configuration file is:

```yaml
port: '4001'
mode: 'local'    #git or local
local-path: 'files'
log-level: 'debug'
apollo-path: '/lib'
graphql-playground: 'true'

git-repos:   #only used in git mode
  - user1:
      repo-url: 'https://gitlab.com/dtaas/user1.git'
  - user2:
      repo-url: 'https://gitlab.com/dtaas/user2.git'
  - common:
      repo-url: 'https://gitlab.com/dtaas/common.git'
```

The `local-path` variable is the relative filepath to the
location of the local directory which will be served to users
by the Library microservice.

Replace the default values the appropriate values for your setup.
Please save this config in `libms.yaml`.

### Operation Modes

The mode indicates the backend storage for the files.
There are two possible modes - `local` and `git`.
The files available in the `local-path` are served to users in `local` mode.
In the `git` mode, the remote git repos are cloned and they are
served to users as local files. Only public git repositories
are supported at present.

#### git mode

A fragment of the config for `git` mode is:

```yaml
...
git-repos:
  - user1:
      repo-url: 'https://gitlab.com/dtaas/user1.git'
  - user2:
      repo-url: 'https://gitlab.com/dtaas/user2.git'
  - common:
      repo-url: 'https://gitlab.com/dtaas/common.git'
```

Here, `user1`, `user2` and `common` are the local directories into which
the remote git repositories get cloned. The name of the repository need not
match with the local directory name. For example, the above configuration
enables library microservice to clone
`https://gitlab.com/dtaas/user1.git` repository into
`user1` directory. Any git server accessible over
HTTP(S) protocol is supported.
The `.git` suffix is optional.

### Run

Use the following commands to start and stop the container respectively:

```bash
docker compose -f compose.lib.yml up -d
docker compose -f compose.lib.yml down
```

The lib microservice website will become available at <http://localhost:4001>.

## Application Programming Interface (API)

The lib microservice application provides services at
two end points:

### HTTP protocol

**URL:** `localhost:4001/lib/files`

The regular file upload and download options become available
via web browser.

### GraphQL protocol

**URL:** `localhost:4001/lib`

<details>
<summary>GraphQL API details</summary>
The lib microservice takes two distinct GraphQL queries.

#### Directory Listing

This query receives directory path and provides list of files
in that directory. A sample query and response are given here.

``` graphql
query {
  listDirectory(path: ".") {
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

#### Fetch a File

This query receives directory path and send the file contents to user in response.

To check this query, create a file `files/data/welcome.txt`
with content of `hello world`.

A sample query and response are given here.

```graphql
query {
  readFile(path: "data/welcome.txt") {
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

### Direct HTTP API Calls in lieu of GraphQL API Calls

The lib microservice also supports making API calls using HTTP POST requests.
Simply send a POST request to the URL endpoint with the GraphQL query in
the request body. Make sure to set the Content-Type header to
"application/json".

The easiest way to perform HTTP requests is to use
[HTTPie](https://github.com/httpie/desktop/releases)
desktop application.
You can download the Ubuntu AppImage and run it. Select the following options:

```txt
Method: POST
URL: localhost:4001
Body: <<copy the json code from examples below>>
Content Type: text/json
```

Here are examples of the HTTP requests and responses for the HTTP API calls.

#### Directory listing

<!-- markdownlint-disable MD013 -->

```http
POST /lib HTTP/1.1
Host: localhost:4001
Content-Type: application/json
Content-Length: 388

{
   "query":"query {\n  listDirectory(path: \".\") {\n    repository {\n      tree {\n        blobs {\n          edges {\n            node {\n              name\n              type\n            }\n          }\n        }\n        trees {\n          edges {\n            node {\n              name\n              type\n            }\n          }\n        }\n      }\n    }\n  }\n}"
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

#### Fetch a file

This query receives directory path and send the file contents to user in response.

To check this query, create a file `files/data/welcome.txt`
with content of `hello world`.

```http
POST /lib HTTP/1.1
Host: localhost:4001
Content-Type: application/json
Content-Length: 217

{
   "query":"query {\n  readFile(path: \"data/welcome.txt\") {\n    repository {\n      blobs {\n        nodes {\n          name\n          rawBlob\n          rawTextBlob\n        }\n      }\n    }\n  }\n}"
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

<!-- markdownlint-enable MD013 -->
</details>
