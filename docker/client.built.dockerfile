#! docker should be run from the root directory of the project
FROM node:22-bullseye-slim AS build

# Set environment variables for better performance
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=error
ENV YARN_CACHE_FOLDER=/tmp/.yarn-cache
ENV NODE_OPTIONS="--max-old-space-size=4096"
ARG REACT_APP_IS_DOCKER
ENV REACT_APP_IS_DOCKER=$REACT_APP_IS_DOCKER

# Set the working directory inside the container
WORKDIR /dtaas/client

# First copy only package.json and yarn.lock to leverage Docker layer caching
COPY ./client/package.json ./client/yarn.lock ./

# Install dependencies with performance flags
RUN yarn install --frozen-lockfile --network-timeout 600000

# Copy the rest of the application code to the working directory
COPY ./client/ ./

# Configure TypeScript for faster compilation
RUN echo '{"compilerOptions": {"skipLibCheck": true}}' > ./tsconfig.dev.json

# Install missing dependencies required for build
RUN yarn add --dev @babel/plugin-proposal-private-property-in-object @types/react-dom

# Build the React app
RUN yarn build

# Production stage
FROM node:22-bullseye-slim AS production

# Set production environment
ENV NODE_ENV=production

# Copy the build output to serve
COPY --from=build /dtaas/client/build /dtaas/client/build
COPY --from=build /dtaas/client/package.json /dtaas/client/package.json

WORKDIR /dtaas/client

# Install serve globally
RUN npm i -g serve

# Expose port 4000 (the port used by client service)
EXPOSE 4000

# Define the command to run the app
CMD ["yarn", "start"]