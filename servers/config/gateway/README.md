# The gateway server

Run the Traefik gateway server in HTTP mode to experience the DTaaS application.
HTTPS mode is disabled for now.

## The background services

The gateway requires background services to serve the URLs. These background
services must be running in order for the gateway to service user requests.
The default configuration uses two services at the following URLs:

| Route / URL     | Background Service | Service URL    |
| :-------------- | :----------------- | :------------- |
| localhost       | React Website      | localhost:4000 |
| localhost/lib   | Lib Microservice   | localhost:4001 |
| localhost/user1 | ML Workspace       | localhost:8090 |
| localhost/user2 | ML Workspace       | localhost:8091 |
|                 |

## Start the Gateway

```bash
docker run -d \
--name "traefik-gateway" \
--network=host -v "$PWD/traefik.yml:/etc/traefik/traefik.yml" \
-v "$PWD/auth:/etc/traefik/auth" \
-v "$PWD/dynamic:/etc/traefik/dynamic" \
-v /var/run/docker.sock:/var/run/docker.sock \
traefik:v2.5
```

## Authentication

The dummy username is `foo` and the password is `bar`.
Please change this before starting the gateway.

```bash
rm auth
htpasswd -c auth <username>
password: <your password>
```

The change in password becomes effective upon restart of **traefik-gateway** container.

## Update Configuration

The gateway serves routes specified in _dynamic/fileConfig.yml_ file.
The **traefik-gateway** gateway comes with ability to receive dynamic configuration.
You can update the configuration in this file to reflect your local setup.
See [Traefik help docs](https://doc.traefik.io/traefik/providers/file/)
for more information.

The routes / URLs need to be updated for your local setup. The current version of software only works for non-localhost setting, i.e. URL other than the localhost. Here is an example,

| Route / URL   | Background Service | Service URL    |
| :------------ | :----------------- | :------------- |
| foo.com       | React Website      | localhost:4000 |
| foo.com/lib   | Lib Microservice   | localhost:4001 |
| foo.com/user1 | ML Workspace       | localhost:8090 |
| foo.com/user2 | ML Workspace       | localhost:8091 |
|               |
