# Development environment for the DTaaS repository.
#
# Build from the repository root as context:
#   docker compose --env-file .env build
#
# UID and GID have no defaults on purpose. They must match the host user,
# or files written through the bind mount get the wrong owner and git
# inside the container reports a dirty tree.
FROM ubuntu:26.04

ARG UID
ARG GID
ARG NODE_MAJOR=24
ARG YARN_VERSION=1.22.22
ARG PLAYWRIGHT_VERSION=1.61.1

ENV DEBIAN_FRONTEND=noninteractive

# Base toolchain: build tools, python, ruby, and the shell utilities the
# project scripts assume (script/base.sh, script/env.sh).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    apache2-utils build-essential ca-certificates curl git gnupg \
    graphviz inotify-tools jq less net-tools openssh-client openssl \
    pipx procps python3 python3-dev python3-venv ruby-full shellcheck \
    sudo unzip zsh \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Node from NodeSource. Node 24 (Krypton) is the current LTS line and
# matches both the CI workflows and the production Dockerfiles.
# COREPACK_HOME is set to a shared path so the prepared yarn survives:
# the user's ~/.cache is a named volume and would shadow the default.
ENV COREPACK_HOME=/opt/corepack
RUN curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare "yarn@${YARN_VERSION}" --activate \
    && chmod -R a+rX /opt/corepack

RUN npm install -g serve pm2 madge markdownlint-cli

RUN gem install --no-document mdl

# Documentation toolchain, from the same pinned list the docs CI job uses,
# so a local build matches the published site.
COPY script/docs/mkdocs-requirements.txt /tmp/mkdocs-requirements.txt
RUN python3 -m venv /opt/dtaas-venv \
    && /opt/dtaas-venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/dtaas-venv/bin/pip install --no-cache-dir \
    -r /tmp/mkdocs-requirements.txt \
    && rm /tmp/mkdocs-requirements.txt

# Python tooling, installed system-wide via pipx so each gets its own
# isolated environment. flake8, pylint and yamllint mirror the checks in
# .github/workflows/lint-scripts.yml.
ENV PIPX_HOME=/opt/pipx \
    PIPX_BIN_DIR=/usr/local/bin
RUN for tool in poetry pre-commit flake8 pylint yamllint; do \
    pipx install "$tool"; \
    done

# System libraries the browsers need. Browser binaries themselves are not
# baked in; a developer runs 'yarn playwright install' into the cache
# volume once.
RUN npx --yes "playwright@${PLAYWRIGHT_VERSION}" install-deps chromium \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Take over the requested uid/gid, evicting whatever the base image put
# there (ubuntu:26.04 ships a user 'ubuntu' at 1000:1000).
RUN existing_user="$(getent passwd "${UID}" | cut -d: -f1)" \
    && { [ -z "${existing_user}" ] || userdel -r "${existing_user}"; } \
    && existing_group="$(getent group "${GID}" | cut -d: -f1)" \
    && { [ -z "${existing_group}" ] || groupdel "${existing_group}"; } \
    && groupadd -g "${GID}" dtaas \
    && useradd -u "${UID}" -g "${GID}" -m -s /bin/zsh dtaas \
    && echo "dtaas ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/dtaas \
    && chmod 0440 /etc/sudoers.d/dtaas

# Named volumes inherit ownership from the image, so these mount points
# must exist and belong to the dtaas user before the volume is created.
RUN mkdir -p /home/dtaas/.cache \
    /workspace/DTaaS/client/node_modules \
    /workspace/DTaaS/servers/lib/node_modules \
    /workspace/DTaaS/servers/logger/node_modules \
    /workspace/DTaaS/lib/dt-automation/node_modules \
    && chown -R dtaas:dtaas /home/dtaas /workspace

ENV PATH=/opt/dtaas-venv/bin:$PATH \
    NODE_OPTIONS=--max-old-space-size=4096 \
    npm_config_cache=/home/dtaas/.cache/npm \
    YARN_CACHE_FOLDER=/home/dtaas/.cache/yarn \
    PLAYWRIGHT_BROWSERS_PATH=/home/dtaas/.cache/ms-playwright

USER dtaas
WORKDIR /workspace/DTaaS
