# Renewing LetsEncrypt Certificates

LetsEncrypt certificates expire every three months and must be renewed
to prevent certificate validation errors in client web browsers. This
guide documents the certificate renewal process for DTaaS platform
installations using LetsEncrypt certificates.

## Overview

The certificate renewal process involves three main phases:

1. **Certificate Generation**: Renewing certificates using LetsEncrypt certbot
2. **Certificate Deployment**: Copying new certificates to appropriate directories
3. **Service Restart**: Restarting affected services to load new certificates

## Prerequisites

- Administrative access to the DTaaS server
- LetsEncrypt certbot installed on the system
- Valid domain name configured for certificate generation
- Access to Docker commands

## Certificate Renewal Process

### Step 1: Generate New Certificates

Use LetsEncrypt certbot to renew existing certificates:

```bash
# Test renewal process without actually renewing
sudo certbot renew --dry-run

# Renew all certificates
sudo certbot renew

# Renew specific certificate for domain
sudo certbot renew --cert-name example.com

```

### Step 2: Locate Certificate Files

After successful renewal, locate the new certificate files:

```bash
# Standard LetsEncrypt certificate location
ls -la /etc/letsencrypt/live/your-domain.com/

# Certificate files:
# - fullchain.pem: Full certificate chain
# - privkey.pem: Private key
# - cert.pem: Certificate only
# - chain.pem: Certificate chain only
```

### Step 3: Deploy Certificates to DTaaS

Copy the renewed certificates to the appropriate DTaaS directories:

```bash
# Copy certificates to DTaaS docker deployment
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem \
  /path/to/DTaaS/deploy/docker/certs/your-domain.com/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem \
  /path/to/DTaaS/deploy/docker/certs/your-domain.com/

# Copy certificates to DTaaS services deployment
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem \
  /path/to/DTaaS/deploy/services/certs/your-domain.com/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem \
  /path/to/DTaaS/deploy/services/certs/your-domain.com/
```

### Step 4: Verify Container Volume Mappings

Before restarting services, verify the volume mappings to ensure certificates
are mounted correctly:

```bash
# Inspect container volume mappings
docker inspect <container-name>

# Look for volume mounts in the output
# Example: "/host/path/certs:/container/path/certs:ro"
```

### Step 5: Restart DTaaS Service Gateway

Navigate to the DTaaS docker deployment directory and restart Traefik:

```bash
cd /path/to/DTaaS/deploy/docker
docker compose -f compose.server.secure.yml --env-file .env.server up \
  -d --force-recreate traefik
```

### Step 6: Restart Platform Services

Navigate to the services directory and restart individual services:

```bash
cd /path/to/DTaaS/deploy/services

# Restart Grafana
docker stop grafana-server
docker start grafana-server

# Restart InfluxDB
docker stop influxdb
docker start influxdb
```

### Step 7: Configure RabbitMQ Certificates

RabbitMQ requires a specific certificate format. Create a copy of the private key
and restart the service:

```bash
# Create RabbitMQ-specific private key
cp /path/to/DTaaS/deploy/services/certs/your-domain.com/privkey.pem \
   /path/to/DTaaS/deploy/services/certs/your-domain.com/privkey-rabbitmq.pem

# Restart RabbitMQ
docker restart rabbitmq
```

### Step 8: Configure MongoDB Certificates

MongoDB requires a combined certificate file containing both the certificate
chain and private key:

```bash
# Create combined certificate file
cat /path/to/DTaaS/deploy/services/certs/your-domain.com/fullchain.pem \
    /path/to/DTaaS/deploy/services/certs/your-domain.com/privkey.pem > \
    /path/to/DTaaS/deploy/services/certs/your-domain.com/combined.pem

# Restart MongoDB with new certificates
cd /path/to/DTaaS/deploy/services
docker compose -f compose.services.secure.yml \
  --env-file config/services.env up -d --force-recreate mongodb
```

## Verification

After completing the renewal process, verify that certificates are properly
installed:

```bash
# Test HTTPS connectivity
curl -I https://your-domain.com

# Check Docker service logs for certificate errors
docker logs traefik
docker logs grafana-server
docker logs mongodb
```

## Troubleshooting

### Common Issues

**Certificate Not Found Error**
: Verify that certificate files exist in the specified directories and have
  correct permissions (typically 644 for certificates, 600 for private keys).

**Service Restart Failures**
: Check Docker service logs for specific error messages. Ensure that certificate
  paths in Docker Compose files match the actual file locations.

**Browser Certificate Warnings**
: Clear browser cache and verify that the certificate chain is complete.
  Check that intermediate certificates are included in the fullchain.pem file.

### Log Analysis

Monitor service logs for certificate-related errors:

```bash
# Monitor Traefik logs
docker logs traefik

# Monitor service logs
docker logs grafana-server
docker logs influxdb
docker logs rabbitmq
docker logs mongodb
```

## Security Considerations

- Store private keys with restrictive permissions (600 or 640)
- Regularly monitor certificate expiration dates
- Implement automated monitoring to alert before certificate expiration
- Maintain backups of certificate files
- Use strong file system permissions on certificate directories
