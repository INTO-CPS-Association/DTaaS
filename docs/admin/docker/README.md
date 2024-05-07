# Install DTaaS using Docker

This guide explains how to install the docker-based version
of DTaaS software.

## Prerequisites

**[Docker](https://www.docker.com/)** - It is important to have docker installed on your system/ server. We highly recommend using [Docker Desktop](https://www.docker.com/products/docker-desktop/).

**[Gitlab Instance](https://about.gitlab.com/install/)** - DTaaS Authorization uses Gitlab OAuth2.0 authentication. Thus, to enable user authentication and authorization for your DTaaS instance, you will need a Gitlab Instance. You can bring up a private instance (recommended), or you can use [gitlab.com](www.gitlab.com) itself.

## Steps

### Clone the DTaaS repository:

```bash
git clone https://github.com/INTO-CPS-Association/DTaaS.git
```

### Setup Gitlab Applications

Refer to [Gitlab Application Setup Documentation](https://github.com/into-cps-association/dtaas/docs/admin/docker/gitlab.md).

### Set the Client env file

Refer to the [Client Setup Documentation](https://github.com/into-cps-association/dtaas/docs/admin/docker/client.md).

### Set the environment variables

- Switch to the docker directory:

```
cd <DTaaS-Path>/docker
```

- Setup the _.env_ file : This file contains
  variables that need to be set to your specific
  use case.

    | URL Path | Example |Access Granted to |
  |:------------|:---------------|:---------------|
  | DTAAS_DIR | '/home/Desktop/DTaaS' | Full path to the DTaaS directory. This is an absolute path with no trailing slash. |
  | SERVER_DNS | <http>_foo.com_</http> or <http>_localhost_</http> | The server DNS, if you are deploying with a dedicated server. Remember not use  <http:>http(s)</http:> at the beginning of the DNS string |
  | OAUTH_URL | <http>_gitlab.foo.com_<http/> | The URL of your Gitlab instance |
  | CLIENT_ID | 'xx' | The ID of your OAuth application |
  | CLIENT_SECRET | 'xx' | The Secret of your OAuth application |
  | OAUTH_SECRET | 'random-secret-string' | Any private random string |
  | username1 | 'user1' | The gitlab instance username of a user of DTaaS |
  | username2 | 'user2' | The gitlab instance username of a user of DTaaS |
  | CLIENT_CONFIG | '/Users/<Username>/DTaaS/deploy/config/client/env.js' | Full path to env.js file for client |

