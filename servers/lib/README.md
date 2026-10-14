# Overview

The **lib microservice** is a simplified file manager which serves files
from local file system or public git repositories. It is possible to

* Upload and download files from web browser
* Query available files and download them using GraphQL API
* Clone public git repositories and serve them as local files

## :arrow_down: Install

### Default NPM Registry

The default registry for npm packages is [npmjs](https://registry.npmjs.org).
Install the package with the following commands

```bash
npm install -g @into-cps-association/libms
```

### Github NPM Registry

The package is also available in Github
[packages registry](https://github.com/orgs/INTO-CPS-Association/packages).

Set the registry and install the package with the following commands

```bash
npm config set @into-cps-association:registry https://npm.pkg.github.com
npm install -g @into-cps-association/libms
```

The _npm install_ command asks for username and password. The username is
your Github username and the password is your Github
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
In order for the npm to download the package, your personal access token
needs to have _read:packages_ scope.

## :gear: Configure

The microservices requires config specified in yaml format.
The template configuration file is:

```yaml
port: '4001'
mode: 'local'    #git or local
local-path: '..\..\files'
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
Please save this config in a file as a yaml file, for example as `libms.yaml`.

### Operation Modes

The mode indicates the backend storage for the files.
There are two possible modes - `local` and `git`.
The files available in the `local-path` are served to users in `local` mode.
In the `git` mode, the remote git repos are cloned and they are
served to users as local files.

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

## :rocket: Use

Display help.

```bash
$libms -h
Usage: libms [options]

The lib microservice is a file server. It supports file transfer
over GraphQL and HTTP protocols.

Options:
  -c, --config <file>  provide the config file (default libms.yaml)
  -H, --http <file>    enable the HTTP server with the specified config
  -h, --help           display help for libms
```

Both the options are not mandatory.

### Configuration file

The config is saved `libms.yaml` file by convention. If `-c` is not specified
The **libms** looks for
`libms.yaml` file in the working directory from which it is run.
If you want to run **libms** without explicitly specifying the configuration
file, run

```bash
libms
```

To run **libms** with a custom config file,

```bash
libms -c FILE-PATH
libms --config FILE-PATH
```

If the environment file is named something other than `libms.yaml`,
for example as `config/libms.yaml.default`, you can run

```sh
libms -c "config/libms.yaml.default"
```

You can press `Ctl+C` to halt the application.

### Protocol Support

The **libms** supports GraphQL protocol by default.
It is possible to enable the HTTP protocol by setting
the `-H` option.

To run **libms** with a custom config for HTTP protocol, use

```bash
libms -H FILE-PATH
libms --http FILE-PATH
```

<details>
<summary>Please see this sample HTTP config file</summary>

```json
{
  "name": "DTaaS Fileserver",
  "auth": false,
  "editor": "edward",
  "packer": "zip",
  "diff": true,
  "zip": true,
  "buffer": true,
  "dirStorage": true,
  "online": false,
  "open": false,
  "oneFilePanel": true,
  "keysPanel": false,
  "prefix": "/lib/files",
  "confirmCopy": true,
  "confirmMove": true,
  "showConfig": false,
  "showDotFiles": false,
  "showFileName": true,
  "contact": false,
  "configDialog": false,
  "console": false,
  "terminal": false,
  "vim": false,
  "columns": "name-size-date-owner-mode",
  "export": false,
  "import": false,
  "dropbox": false,
  "dropboxToken": "",
  "log": true
}
```

</details>

## Application Programming Interface (API)

The lib microservice application provides services at
two end points:

### HTTP protocol

Endpoint: `localhost:PORT/lib/files`

This option needs to be enabled with `-H http.json` flag.
The regular file upload and download options become available.

### GraphQL protocol

Endpoint: `localhost:PORT/lib`

<details>
<summary>GraphQL API details</summary>
The lib microservice takes two distinct GraphQL queries.

#### Directory Listing

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

#### Fetch a File

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

#### Fetch a file

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

<!-- markdownlint-enable MD013 -->
</details>
