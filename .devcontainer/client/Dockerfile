FROM mcr.microsoft.com/devcontainers/typescript-node:22-bullseye

# Accept build arguments
ARG NODE_USER=node

# Install additional packages needed for client development
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    graphviz curl net-tools exa powerline \
    inotify-tools procps \
    git ca-certificates \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Set up higher inotify watches limit at container level
RUN mkdir -p /etc/sysctl.d/ \
    && echo "fs.inotify.max_user_watches=524288" > /etc/sysctl.d/40-max-user-watches.conf \
    && echo "fs.inotify.max_user_instances=512" > /etc/sysctl.d/40-max-user-instances.conf

# Install global packages for frontend development
RUN npm install -g serve madge serve-handler markdownlint-cli \
    nodemon chokidar-cli react-devtools

# Set up proper node user directories with correct permissions
RUN mkdir -p /home/${NODE_USER}/.npm /home/${NODE_USER}/.cache \
    && chown -R ${NODE_USER}:${NODE_USER} /home/${NODE_USER}/.npm /home/${NODE_USER}/.cache \
    && npm config --global set prefix /home/${NODE_USER}/.npm

# Ensure proper permissions for node_modules directory
RUN mkdir -p /workspaces/DTaaS/client/node_modules \
    && chown -R ${NODE_USER}:${NODE_USER} /workspaces/DTaaS/client/node_modules

RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set save-exact true && \
    npm config set fund false
    
# Set environment variables - keeping these here since they're used during build time too
ENV NODE_ENV=development \
    YARN_CACHE_FOLDER=/tmp/.yarn-cache \
    NODE_OPTIONS="--max-old-space-size=4096" \
    TSC_WATCHFILE=UseFsEventsWithFallbackDynamicPolling

# Working directory
WORKDIR /workspaces/DTaaS