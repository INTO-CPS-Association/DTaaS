# Add a new user

This page will guide you on, how to add more users to the DTaas. Please do the following:

<!-- prettier-ignore -->
!!! important
    Make sure to replace **<username\>** and **<port\>**
    Select a port that is not already being used by the system.

**1. Add user:**

Add the new user on the Gitlab instance.

**2. Setup a new workspace:**

The above code creates a new workspace for the new user based on _user2_.

```bash
cd DTaaS/files
cp -R user2 <username>
cd ..
docker run -d \
 -p <port>:8080 \
  --name "ml-workspace-<username>" \
  -v "${TOP_DIR}/files/<username>:/workspace" \
  -v "${TOP_DIR}/files/<username>:/workspace/common" \
  --env AUTHENTICATE_VIA_JUPYTER="" \
  --env WORKSPACE_BASE_URL="<username>" \
  --shm-size 512m \
  --restart always \
  mltooling/ml-workspace-minimal:0.13.2
```

**3. Add username and password:**

The following code adds basic authentication for the new user.

```bash
cd DTaaS/servers/config/gateway
htpasswd auth <username>
```

**4. Add 'route' for new user:**

We need to add a new route to the servers ingress.

Open the following file with your preffered editor (e.g. VIM/nano).

```bash
vi DTaaS/servers/config/gateway/dynamic/fileConfig.yml
```

Now add the new route and service for the user.

<!-- prettier-ignore -->
!!! important
  foo.com should be replaced with your own domain.

```yml
http:
  routers:
    ....
    <username>:
      entryPoints:
        - http
      rule: 'Host(`foo.com`) && PathPrefix(`/<username>`)'
      middlewares:
        - basic-auth
      service: <username>

  services:
    ...
    <username>:
      loadBalancer:
        servers:
          - url: 'http://localhost:<port>'
```

**5. Access the new user:**

Log into the DTaaS application as new user.
