# Update basepath/route for the application

The updates required to make the application
work with basepath (say bar):

## 1. Change the Gitlab OAuth URLs to include basepath

```yml
  REACT_APP_AUTH_AUTHORITY: 'https://gitlab.foo.com/',
  REACT_APP_REDIRECT_URI: 'https://foo.com/bar/Library',
  REACT_APP_LOGOUT_REDIRECT_URI: 'https://foo.com/bar',
```

## 2. Update traefik gateway config (deploy/config/gateway/fileConfig.yml)

```yml
http:
  routers:
    dtaas:
      entryPoints:
        - http
      rule: "Host(`foo.com`)" #remember, there is no basepath for this rule
      middlewares:
        - basic-auth
      service: dtaas

    user1:
      entryPoints:
        - http
      rule: "Host(`foo.com`) && PathPrefix(`/bar/user1`)"
      middlewares:
        - basic-auth
      service: user1

  # Middleware: Basic authentication
  middlewares:
    basic-auth:
      basicAuth:
        usersFile: "/etc/traefik/auth"
        removeHeader: true

  services:
    dtaas:
      loadBalancer:
        servers:
          - url: "http://localhost:4000"

    user1:
      loadBalancer:
        servers:
          - url: "http://localhost:8090"
```

## 3. Update deploy/config/client/env.js

Use the [client documentation](../client/CLIENT.md) for an example.

## 4. Update install scripts

Update deploy/install.sh by adding basepath. For example,

WORKSPACE_BASE_URL="bar/" for all user workspaces.

For user1, the docker command becomes:

```sh
docker run -d \
 -p 8090:8080 \
  --name "ml-workspace-user1" \
  -v "${TOP_DIR}/files/user1:/workspace" \
  -v "${TOP_DIR}/files/common:/workspace/common" \
  --env AUTHENTICATE_VIA_JUPYTER="" \
  --env WORKSPACE_BASE_URL="bar/user1" \
  --shm-size 512m \
  --restart always \
  mltooling/ml-workspace:0.13.2 || true
```

## 5. Proceed with install using deploy/install.sh
