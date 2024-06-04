FROM node:20.10.0-slim as build

#! docker should be run from the root directory of the project

# Set the working directory inside the container
WORKDIR /dtaas/libms

# Copy package.json and yarn.lock to the working directory
COPY ./servers/lib/package.json ./
COPY ./servers/lib/yarn.lock ./

# Install dependencies
RUN yarn install --immutable --immutable-cache --check-cache

# Copy the rest of the application code to the working directory
COPY ./servers/lib/ ./

# Build the app
RUN yarn build

FROM node:20.10.0-slim
COPY --from=build /dtaas/libms/dist /dtaas/libms/dist
COPY --from=build /dtaas/libms/package.json /dtaas/libms/package.json
COPY --from=build /dtaas/libms/node_modules /dtaas/libms/node_modules

WORKDIR /dtaas/libms

COPY ./servers/lib/config/.env.default .env
COPY ./servers/lib/config/http.json .

# Define the command to run your app
CMD ["yarn", "start", "-H", "http.json"]