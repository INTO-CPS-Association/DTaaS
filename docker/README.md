# Dockerized

This readme will explain the different docker files and what the purpose of those are.

## Folder Structure
  
- **client.dockerfile**: Dockerfile for building the client application container. 
- **libms.dockerfile**: Dockerfile for building the library microservice container.
- **compose.dev.yml:** Docker Compose configuration for development environment.
- **compose.local.yml:** Docker Compose configuration for local installation.

## Running Docker Containers

Follow these steps to set up and run the application with docker.
### Prerequisites
- Docker: Install Docker on your machine.

### Build Docker Images
Navigate to the `/docker` folder in your terminal and build the Docker images.
**NB:** the docker images only needs to be build when using **development** environment.

```sh
docker-compose -f compose.dev.yml build
```

### Run Docker Compose

For development environment:

```bash
docker-compose -f compose.dev.yml up -d
```

For local environment:

```bash
docker-compose -f compose.local.yml up -d
```
### Access the Application
You should access the application through the PORT mapped to the Traefik container.
e.g. `localhost:9000`