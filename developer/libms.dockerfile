FROM node:26.10.0-slim AS build
RUN npm install --global --ignore-scripts yarn@1.22.22

#! docker should be run from the root directory of the project

# Set the working directory inside the container
WORKDIR /dtaas/libms

# Copy the the application code to the working directory
COPY ./servers/lib/ .

# Install dependencies
RUN yarn install --immutable --immutable-cache --check-cache --network-timeout 1000000

# Build the app
RUN yarn build


FROM node:26.10.0-slim
WORKDIR /dtaas/libms
RUN chown node:node /dtaas/libms
COPY --from=build --chown=node:node /dtaas/libms/dist ./dist
COPY --from=build --chown=node:node /dtaas/libms/node_modules ./node_modules
COPY --from=build --chown=node:node /dtaas/libms/package.json ./package.json
COPY --from=build --chown=node:node /dtaas/libms/config ./config
COPY --chown=node:node ./developer/config/libms.dev.yaml.example libms.yaml

USER node

# Define the command to run your app
CMD ["node", "dist/src/main.js", "--config", "libms.yaml", "-H", "config/http.json"]
