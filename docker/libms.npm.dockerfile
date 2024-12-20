FROM node:22.12.0-slim

#! docker should be run from the root directory of the project

# Set the working directory inside the container
WORKDIR /dtaas/libms

# pull the libms package from npm registry
ARG VERSION="latest"
RUN npm i -g @into-cps-association/libms@${VERSION}

COPY ./deploy/config/libms.yaml libms.yaml
COPY ./servers/lib/config/http.json .

# Define the command to run your app
CMD ["libms", "-H", "http.json"]