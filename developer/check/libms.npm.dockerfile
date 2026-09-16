FROM node:26.10.0-slim

#! docker should be run from the root directory of the project

# Set the working directory inside the container
WORKDIR /dtaas/libms

# pull the libms package from npm registry
ARG VERSION="latest"
RUN npm i -g @into-cps-association/libms@${VERSION} \
  && chown node:node /dtaas/libms

COPY --chown=node:node ./developer/check/config/libms.dev.yaml.example libms.yaml
COPY --chown=node:node ./servers/lib/config/http.json .

USER node

# Define the command to run your app
CMD ["libms", "-H", "http.json"]
