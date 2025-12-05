# Add other services

<!-- prettier-ignore -->
!!! Pre-requisite
    You should read the documentation about
    the already available [services](../services.md)

This guide will show you how to add more services to the DTaaS platform.
The default services (InfluxDB, Grafana, RabbitMQ, and MongoDB) are
already configured in the `deploy/services/manual/compose.services.secure.yml` file.

:fontawesome-solid-circle-info:
**Adding other services requires more RAM and CPU power.**
**Please make sure the host machine meets the hardware requirements**
**for running all the services.**

## Adding a New Service

To add a new service, you need to:

1. **Add the service to Docker Compose**
2. **Configure environment variables**
3. **Set up certificates (if required)**
4. **Update the CLI (optional)**

### Example: Adding a Custom Service

In this example, we'll add a Redis service to demonstrate the process.

**1. Add service configuration to Docker Compose:**

Open `/deploy/services/manual/compose.services.secure.yml` and add your service:

```yaml
services:
  # ... existing services ...

  redis:
    image: 'redis:7.2'
    container_name: redis
    restart: always
    ports:
      - '${REDIS_PORT}:6379'
    volumes:
      - './data/redis:/data'
      - './certs/${HOSTNAME}:/etc/ssl'
    command: >
      redis-server
      --tls-port 6379
      --port 0
      --tls-cert-file /etc/ssl/fullchain.pem
      --tls-key-file /etc/ssl/privkey.pem
      --requirepass ${REDIS_PASSWORD}
    networks:
      - platform-services
```

**2. Add environment variables:**

Open `/deploy/services/manual/config/services.env.template` and add:

```bash
# Redis settings
REDIS_PORT=8089
REDIS_PASSWORD=your_secure_password
```

Update your actual `services.env` file with the real values.

**3. Create data directory:**

```bash
cd /home/runner/work/DTaaS/DTaaS/deploy/services/manual
mkdir -p data/redis
```

**4. Restart services:**

```bash
cd /home/runner/work/DTaaS/DTaaS/deploy/services/cli
poetry run dtaas-services start
```

The new service should now be available on **services.foo.com:<REDIS_PORT>**.

## Notes

- Services are now managed through Docker Compose
- All services use TLS certificates for secure communication
- The CLI tool simplifies service management
- For manual service management, see the [manual installation guide](../manual/README.md)

