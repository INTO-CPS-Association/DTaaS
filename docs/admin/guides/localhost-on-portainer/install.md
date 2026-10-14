# Install DTaaS on Localhost (GUI)

This guide runs DTaaS on localhost through a graphical user interface
(GUI). It suits a single user who wants to run DTaaS on their own
computer.

Two installation scenarios are available:

| Scenario                                      | Auth Provider | External Account Required |
| :-------------------------------------------- | :------------ | :------------------------ |
| [DTaaS Localhost](#1-dtaas-localhost)         | GitLab OAuth  | Yes (gitlab.com)          |
| [Workspace Localhost](#2-workspace-localhost) | Dex (local)   | No                        |

## Requirements

- Docker Desktop or Docker Engine with the Compose plugin
- [Portainer Community Edition](https://portainer.io) (setup below)

## Download Packages

Download the package for your scenario:

1. **dtaas-localhost-xx.zip** for the DTaaS localhost installation, or
1. **workspace-dex-localhost-xx.zip** for the Workspace localhost
   installation

!!! tip
    The guide uses Linux-style paths such as `/Users/username/DTaaS`.
    On Windows use an equivalent path, for example `C:\DTaaS`.

## Start Portainer

[Portainer Community Edition](https://portainer.io) provides a graphical
interface for managing Docker containers at `https://localhost:9443`.

Follow
[the official Portainer CE documentation](https://docs.portainer.io/start/install-ce/server/docker)
or run these commands:

```bash
docker volume create portainer_data
docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data portainer/portainer-ce:2.21.4
```

Open `https://localhost:9443` and complete the
[Initial Setup](https://docs.portainer.io/start/install-ce/server/setup)
to create an administrator account.

![Portainer Admin Dashboard](./portainer_dashboard.png)

!!! tip
    To restart Portainer later, run `docker start portainer`.

## 1. DTaaS Localhost

Unzip the **dtaas-localhost-xx.zip** package, which contains the
installation files. This scenario uses **GitLab OAuth** for
authentication and needs a GitLab account on <https://gitlab.com>.

![DTaaS Localhost](localhost.png){ .on-white }

### 1.1 Configuration

#### 1.2 Create Configuration Files

Copy the example files:

```bash
cp config/.env.example config/.env
cp config/client.js.example config/client.js
```

#### 1.3 Environment Variables

Edit `config/.env`:

| Variable               | Example | Description                           |
| :--------------------- | :------ | :------------------------------------ |
| `DEFAULT_USER`         | `user1` | Workspace path prefix and folder name |
| `COMPOSE_PROJECT_NAME` | `dtaas` | Docker Compose project name           |

#### 1.4 Client Configuration

This step is optional. If the localhost installation needs its own
OAuth 2.0 application, follow these [steps](../../client/auth.md) to
create one. Then edit `config/client.js` and set the OAuth application
credentials from the GitLab account:

| Variable                   | Example               | Description                 |
| :------------------------- | :-------------------- | :-------------------------- |
| `REACT_APP_CLIENT_ID`      | _(OAuth app id)_      | GitLab OAuth application ID |
| `REACT_APP_AUTH_AUTHORITY` | `https://gitlab.com/` | OAuth authority URL         |

#### 1.5 Create User Workspace

Create a workspace directory for the user set in `DEFAULT_USER`:

```bash
cp -R files/template files/<DEFAULT_USER>
sudo chown -R 1000:100 files/*
```

### 1.6 Create the Portainer Stack

![Portainer Stacks](dtaas-stack-create.png)

1. Navigate to **Stacks** and click **Add Stack**.
1. Name the stack, for example `dtaas-localhost`.
1. Select the **Upload** build method.
1. Upload the compose file (`docker-compose.yml`).
1. Load the environment file (`config/.env`).

!!! tip
    If the `.env` file is not visible, select **All Files** in the
    file explorer dialog.

Click **Deploy the stack**. Portainer creates a stack with this name,
which looks like this:

![Portainer DTaaS Stack](portainer-dtaas-stack.png)

### 1.7 Use

Open <http://localhost> in a web browser and sign in with
the configured GitLab credentials.

### 1.8 Limitations

This scenario does not include the
[library microservice](../../servers/lib/docker.md) or backend
forward-auth.

## 2. Workspace Localhost

Unzip the **workspace-dex-localhost-xx.zip** package, which contains the
installation files.

This scenario uses **Dex** as a local identity provider.
It needs no external account and comes with default credentials.

![Workspace Localhost](localhost.png){ .on-white }

### 2.1 Configuration

Copy the example files:

```bash
cp config/.env.example config/.env
cp config/dex-config.yaml.example config/dex-config.yaml
```

#### 2.2 Environment Variables

Edit `config/.env`:

| Variable               | Example | Description                        |
| :--------------------- | :------ | :--------------------------------- |
| `COMPOSE_PROJECT_NAME` | `dtaas` | Docker Compose project name        |
| `DEFAULT_USER`         | `user`  | Default user login profile for Dex |

<!-- markdownlint-disable MD046 -->
!!! tip
    The local login users are defined in `config/dex-config.yaml`.
<!-- markdownlint-enable MD046 -->

### 2.3 Create the Portainer Stack

1. Navigate to **Stacks** and click **Add Stack**.
1. Name the stack, for example `workspace-localhost`.
1. Select the **Upload** build method.
1. Upload the compose file (`docker-compose.yml`).
1. Load the environment file (`config/.env`).

Click **Deploy the stack**.

### 2.4 Use

Open <http://localhost> in a web browser.
Sign in with the default Dex credentials:

- **Email:** `user@intocps.org`
- **Password:** `user`

### 2.5 Limitations

- This scenario does not include the
  [library microservice](../../servers/lib/docker.md).
- [DevOps features](../../../user/digital-twins/devops/capabilities.md)
  are not available.
- See the [custom user instructions](../../workspace/localhost/custom-user.md)
  to change the default credentials.

## References

Image sources:
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[reactjs](https://krify.co/about-reactjs/),
[gitlab](https://gitlab.com)
