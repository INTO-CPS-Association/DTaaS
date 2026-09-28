FROM node:26.10.0-slim AS build
RUN npm install --global yarn@1.22.22

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
RUN npm install --global yarn@1.22.22
COPY --from=build /dtaas/libms/dist /dtaas/libms/dist
COPY --from=build /dtaas/libms/node_modules /dtaas/libms/node_modules
COPY --from=build /dtaas/libms/package.json /dtaas/libms/package.json
COPY --from=build /dtaas/libms/config /dtaas/libms/config

WORKDIR /dtaas/libms
COPY ./developer/config/libms.dev.yaml.example libms.yaml

# Define the command to run your app
CMD ["yarn", "start", "--config", "libms.yaml", "-H", "config/http.json"]
