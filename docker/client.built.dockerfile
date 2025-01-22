#! docker should be run from the root directory of the project
FROM node:20.10.0-slim as build

ARG REACT_APP_IS_DOCKER
ENV REACT_APP_IS_DOCKER=$REACT_APP_IS_DOCKER

# Set the working directory inside the container
WORKDIR /dtaas/client

# Copy package.json and package-lock.json to the working directory
COPY ./client/package.json ./

# Copy the rest of the application code to the working directory
COPY ./client/ .

WORKDIR /dtaas/client
RUN npm i -g serve
# Define the command to run your app
CMD ["yarn", "start"]