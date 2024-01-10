#! docker should be run from the root directory of the project
FROM node:20.10.0-slim

# Set the working directory inside the container
WORKDIR /dtaas/client

# Copy package.json and package-lock.json to the working directory
COPY ./client/package.json ./

# Install dependencies
RUN yarn install --immutable --immutable-cache --check-cache

# Copy the rest of the application code to the working directory
COPY ./client/ .

# Build the React app
RUN yarn build

# Define the command to run your app
CMD ["yarn", "start"]