#!/bin/sh

container_name="auth_container"
image_name="auth_image"

# Stop and remove the container if it's already running
docker stop $container_name 2>/dev/null
docker rm $container_name 2>/dev/null

# Build the Docker image
docker build -t $image_name .

# Run the Docker container
docker run --name $container_name -p 8090:8090 -d $image_name