# :computer: Install DTaaS on Localhost (GUI)

The installation instructions provided in this document are
ideal for running DTaaS on localhost via a Graphical User
Interface (GUI).
This installation is ideal for single users intending to use
DTaaS on their own computers.

Two installation scenarios are available:

| Scenario | Auth Provider | External Account Required |
| :------- | :------------ | :------------------------ |
| [DTaaS Localhost](#1-globe_with_meridians-dtaas-localhost) | GitLab OAuth | Yes (gitlab.com) |
| [Workspace Localhost](#2-shield-workspace-localhost) | Dex (local) | No |

## :clipboard: Requirements

- Docker Desktop or Docker Engine with Compose plugin
- [Portainer Community Edition](https://portainer.io) (setup below)

## :file_folder: Clone Codebase

```bash
git clone https://github.com/INTO-CPS-Association/DTaaS.git
cd DTaaS
```

!!! tip
    The guide uses Linux-style paths such as `/Users/username/DTaaS`.
    On Windows use an equivalent path, for example `C:\DTaaS`.

## :whale: Starting Portainer

[Portainer Community Edition](https://portainer.io) provides a graphical
interface for managing Docker containers at `https://localhost:9443`.

Follow
[the official Portainer CE documentation](https://docs.portainer.io/start/install-ce/server/docker)
or run the commands below:

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

---

## 1. :globe_with_meridians: DTaaS Localhost

This scenario uses **GitLab OAuth** for authentication.
A GitLab account on <https://gitlab.com> is required.

![DTaaS Localhost](localhost.png)

### 1.1 Configuration

#### 1.2 Create Configuration Files

Navigate to `deploy/dtaas/docker/localhost` and copy the example files:

```bash
cp config/.env.example config/.env
cp config/client.js.example config/client.js
```

#### 1.3 Environment Variables

Edit `config/.env`:

| Variable | Example | Description |
| :--- | :--- | :--- |
| `USERNAME` | `user1` | Workspace path prefix and folder name |
| `COMPOSE_PROJECT_NAME` | `dtaas` | Docker Compose project name |

#### 1.4 Client Configuration

Edit `config/client.js` and set the OAuth application credentials
from the GitLab account:

| Variable | Example | Description |
| :--- | :--- | :--- |
| `REACT_APP_CLIENT_ID` | _(OAuth app id)_ | GitLab OAuth application ID |
| `REACT_APP_AUTH_AUTHORITY` | `https://gitlab.com/` | OAuth authority URL |

<!-- markdownlint-disable MD046 -->
!!! tip
    See the [client auth docs](../../client/auth.md)
    for details on creating a GitLab OAuth application.
<!-- markdownlint-enable MD046 -->

#### 1.5 Create User Workspace

Create a workspace directory for the user set in `USERNAME`:

```bash
cp -R files/template files/<USERNAME>
sudo chown -R 1000:100 files/*
```

### 1.6 Create the Portainer Stack

![Portainer Stacks](dtaas-stack-create.png)

1. Navigate to **Stacks** and click **Add Stack**.
1. Name the stack, for example `dtaas-localhost`.
1. Select the **Upload** build method.
1. Upload the compose file at
   `deploy/dtaas/docker/localhost/docker-compose.yml`.
1. Load the environment file `deploy/dtaas/docker/localhost/config/.env`.

!!! tip
    If the `.env` file is not visible, select **All Files** in the
    file explorer dialog.

Click **Deploy the stack**. A new stack with this name gets created.
It has the following view.

![Portainer DTaaS Stack](portainer-dtaas-stack.png)

### 1.7 Use

Open <http://localhost> in a web browser and sign in with
the configured GitLab credentials.

### 1.8 Limitations

The [library microservice](../../servers/lib/docker.md) and
backend forward-auth are not included in this scenario.

---

## 2. :shield: Workspace Localhost

This scenario uses **Dex** as a local identity provider.
No external account is required; default credentials are provided.

![Workspace Localhost](localhost.png)

### 2.1 Configuration

Navigate to `deploy/workspace/dex/localhost` and copy the
example files:

```bash
cp .env.example .env
cp config/dex-config.yaml.example config/dex-config.yaml
```

#### 2.2 Environment Variables

Edit `.env`:

| Variable | Example | Description |
| :--- | :--- | :--- |
| `COMPOSE_PROJECT_NAME` | `dtaas` | Docker Compose project name |
| `DEFAULT_USER` | `user` | Default user login profile for Dex |

<!-- markdownlint-disable MD046 -->
!!! tip
    Local login users may be customised in
    `deploy/workspace/dex/localhost/config/dex-config.yaml`.
<!-- markdownlint-enable MD046 -->

### 2.3 Create the Portainer Stack

1. Navigate to **Stacks** and click **Add Stack**.
1. Name the stack, for example `workspace-localhost`.
1. Select the **Upload** build method.
1. Upload the compose file at
   `deploy/workspace/dex/localhost/docker-compose.yml`.
1. Load the environment file `deploy/workspace/dex/localhost/.env`.

Click **Deploy the stack**.

### 2.4 Use

Open <http://localhost> in a web browser.
Sign in using the default Dex credentials:

- **Email:** `user@intocps.org`
- **Password:** `user`

### 2.5 Limitations

- The [library microservice](../../servers/lib/docker.md) is not
  included in this scenario.
- DevOps features are not available.
- See [custom user instructions](../../workspace/localhost/custom-user.md)
  for changing the default credentials.

## References

Image sources:
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[reactjs](https://krify.co/about-reactjs/),
[gitlab](https://gitlab.com)
