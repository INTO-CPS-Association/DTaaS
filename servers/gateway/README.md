# Steps to launch the gateway server

Run the gateway server to experience the DTaaS application.

## Copy the certificates

Copy the following certificates from `ssl/` top-level directory to `certs`.

1) certs/ca.cert.pem
1) certs/services/traefik.cert.pem
1) private/services/traefik-nopasswd.key.pem

## Launch the background services

```bash
# start server for client website hosting at 4000. From top-level
cd client
yarn start # if required build the application first

docker run -d --name=grafana --network=host grafana/grafana

# Run traefik reverse proxy. From top-level
cd servers/gateway

docker run -d \            
--network=host -v $PWD/traefik.yml:/etc/traefik/traefik.yml \
-v $PWD/dynamic:/etc/traefik/dynamic \
-v $PWD/certs:/etc/traefik/certs \
-v /var/run/docker.sock:/var/run/docker.sock \
traefik:v2.5
# the Traefik admin dashboard will be available at
#   http://localhost:8080

```

## References

[YAML indentation](https://community.traefik.io/t/the-service-myservice-file-does-not-exist/2133), [HTTPS in Traefik](https://doc.traefik.io/traefik/https/overview/), [adding tls option to routers](https://traefik.io/blog/traefik-2-tls-101-23b4fbee81f1/), self-signed certificates - [1](https://kevinquillen.com/setting-traefik-2-local-ssl-certificate) and [2](https://community.traefik.io/t/use-traefik-with-self-signed-certificate/8733), [wildcard subdomain](https://stackoverflow.com/questions/58141564/traefik-v2-get-wildcard-certificate),, [ca certificates](https://community.traefik.io/t/use-traefik-with-self-signed-certificate/8733), [https dashboard](https://dev.to/karvounis/advanced-traefik-configuration-tutorial-tls-dashboard-ping-metrics-authentication-and-more-4doh), [basic docker compose tutorial](https://medium.com/@containeroo/traefik-2-0-docker-a-simple-step-by-step-guide-e0be0c17cfa5)
