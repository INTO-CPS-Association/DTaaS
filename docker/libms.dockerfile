FROM node:24.12.0-slim as build

#! docker should be run from the root directory of the project

# Set the working directory inside the container
WORKDIR /dtaas/libms

# Copy the the application code to the working directory
COPY ./servers/lib/ .

# Install dependencies
RUN yarn install --immutable --immutable-cache --check-cache

# Build the app
RUN yarn build


FROM node:24.12.0-slim
COPY --from=build /dtaas/libms/dist /dtaas/libms/dist
COPY --from=build /dtaas/libms/node_modules /dtaas/libms/node_modules
COPY --from=build /dtaas/libms/package.json /dtaas/libms/package.json
COPY --from=build /dtaas/libms/config /dtaas/libms/config

WORKDIR /dtaas/libms
COPY ./deploy/config/libms.yaml libms.yaml

# Define the command to run your app
CMD ["yarn", "start", "--config", "libms.yaml", "-H", "config/http.json"]