#! docker should be run from the root directory of the project
FROM node:26.10.0-slim AS build
RUN npm install --global --ignore-scripts yarn@1.22.22

# Set the working directory inside the container
WORKDIR /dtaas/client

# Copy package.json and package-lock.json to the working directory
COPY ./client/package.json ./
COPY ./client/yarn.lock ./

# Install dependencies
RUN yarn install --immutable --immutable-cache --check-cache --network-timeout 1000000

# Copy the rest of the application code to the working directory
COPY ./client/ .

# Build the React app
RUN yarn build


FROM node:26.10.0-slim
# Copy the build output to serve
COPY --from=build /dtaas/client/build /dtaas/client/build
COPY --from=build /dtaas/client/package.json /dtaas/client/package.json

WORKDIR /dtaas/client
RUN npm install --global --ignore-scripts serve@14.2.6
USER node
# Define the command to run your app
CMD ["serve", "-s", "build", "-l", "4000"]