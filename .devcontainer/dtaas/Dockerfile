FROM mcr.microsoft.com/devcontainers/typescript-node:22-bullseye

# Accept build arguments
ARG NODE_USER=node

# Install additional development packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    graphviz curl net-tools htop tmux python3-pip python3-dev \
    rubygems powerline exa inotify-tools \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Set up higher inotify watches limit at container level
RUN mkdir -p /etc/sysctl.d/ \
    && echo "fs.inotify.max_user_watches=524288" > /etc/sysctl.d/40-max-user-watches.conf \
    && echo "fs.inotify.max_user_instances=512" > /etc/sysctl.d/40-max-user-instances.conf

# Install global node packages
RUN npm install -g serve madge @nestjs/cli serve-handler markdownlint-cli

# Install Python tools for documentation and development
RUN pip3 install --no-cache-dir \
    mkdocs mkdocs-material pymdown-extensions \
    python-markdown-math mkdocs-open-in-new-tab \
    mkdocs-with-pdf \
    mkdocstrings[crystal,python] mkdocs-monorepo-plugin \
    mkdocs-pdf-export-plugin mkdocs-awesome-pages-plugin \
    qrcode pipx poetry pre-commit

# Install Ruby-based tools
RUN gem install mdl

# Set up proper node user directories with correct permissions
RUN mkdir -p /home/${NODE_USER}/.npm /home/${NODE_USER}/.cache /home/${NODE_USER}/.local \
    && chown -R ${NODE_USER}:${NODE_USER} /home/${NODE_USER}/.npm /home/${NODE_USER}/.cache /home/${NODE_USER}/.local \
    && npm config --global set prefix /home/${NODE_USER}/.npm

# Ensure proper permissions for node_modules directory
RUN mkdir -p /workspaces/DTaaS/client/node_modules \
    && chown -R ${NODE_USER}:${NODE_USER} /workspaces/DTaaS/client/node_modules

# Set environment variables
ENV NODE_ENV=development \
    NODE_OPTIONS="--max-old-space-size=4096"

# Set working directory
WORKDIR /workspaces/DTaaS