#! docker should be run from the root directory of the project
FROM node:24.12.0-slim as build

# Set the working directory inside the container
WORKDIR /dtaas/client

# Copy package.json and package-lock.json to the working directory
COPY ./client/package.json ./
COPY ./client/yarn.lock ./

# Install dependencies
RUN yarn install --immutable --immutable-cache --check-cache

# Copy the rest of the application code to the working directory
COPY ./client/ .

# Build the React app
RUN yarn build


FROM node:24.12.0-slim
# Copy the build output to serve
COPY --from=build /dtaas/client/build /dtaas/client/build
COPY --from=build /dtaas/client/package.json /dtaas/client/package.json

WORKDIR /dtaas/client
RUN npm i -g serve
# Define the command to run your app
CMD ["yarn", "start"]