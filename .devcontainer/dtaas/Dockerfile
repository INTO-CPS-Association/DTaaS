FROM mcr.microsoft.com/devcontainers/typescript-node:22-bullseye

# Install additional development packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    graphviz curl net-tools htop tmux python3-pip python3-dev \
    rubygems \
    powerline exa \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install global node packages
RUN npm install -g serve madge nestjs/cli vercel/serve

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

# Install markdownlint-cli
RUN npm install -g markdownlint-cli