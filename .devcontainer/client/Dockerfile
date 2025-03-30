FROM mcr.microsoft.com/devcontainers/typescript-node:22-bullseye

# Install additional packages needed for client development
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    graphviz curl net-tools exa powerline \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Set environment variables for better development performance
ENV NODE_ENV=development
ENV YARN_CACHE_FOLDER=/tmp/.yarn-cache
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install global packages
RUN npm install -g serve madge vercel/serve markdownlint-cli