# Development environment for the DTaaS repository.
#
# Build from the repository root as context:
#   docker compose --env-file .env build
#
# UID and GID have no defaults on purpose. They must match the host user,
# or files written through the bind mount get the wrong owner and git
# inside the container reports a dirty tree.

# Node comes from the official image rather than a downloaded install
# script, so its provenance is the pinned image tag. It matches the
# production Dockerfiles in developer/check/.
FROM node:26.10.0-slim AS node

FROM ubuntu:26.04

ARG UID
ARG GID
ARG PLAYWRIGHT_VERSION=1.61.1

ENV DEBIAN_FRONTEND=noninteractive

# Base toolchain: build tools, python, ruby, and the shell utilities the
# project scripts assume (script/base.sh, script/env.sh).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    apache2-utils build-essential ca-certificates curl git git-lfs gnupg \
    graphviz inotify-tools jq less net-tools openssh-client openssl \
    pipx procps python3 python3-dev python3-venv ruby-full shellcheck \
    sudo unzip zsh \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && git lfs install --system

# Node 26 does not ship corepack, so yarn is installed through npm like
# in the production Dockerfiles. Versions are pinned and lifecycle
# scripts are skipped; none of these tools needs one.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=node /usr/local/include/node /usr/local/include/node
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && npm install --global --ignore-scripts \
    yarn@1.22.22 serve@14.2.6 pm2@7.0.4 madge@8.0.0 \
    markdownlint-cli@0.49.1 "playwright@${PLAYWRIGHT_VERSION}" \
    && npm cache clean --force

# Documentation toolchain for mkdocs.yml. This is a superset of the list
# the docs CI job installs: CI publishes mkdocs-github.yml, which omits
# the with-pdf plugin that mkdocs.yml declares.
COPY script/docs/mkdocs-requirements.txt /tmp/mkdocs-requirements.txt

# Python tooling, installed system-wide via pipx so each gets its own
# isolated environment. flake8, pylint and yamllint mirror the checks in
# .github/workflows/lint-scripts.yml. mdl is the Ruby markdown linter.
#
# Playwright's install-deps adds the system libraries the browsers need.
# Browser binaries themselves are not baked in; a developer runs
# 'yarn playwright install' into the cache volume once.
ENV PIPX_HOME=/opt/pipx \
    PIPX_BIN_DIR=/usr/local/bin
RUN python3 -m venv /opt/dtaas-venv \
    && /opt/dtaas-venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/dtaas-venv/bin/pip install --no-cache-dir \
    -r /tmp/mkdocs-requirements.txt \
    && rm /tmp/mkdocs-requirements.txt \
    && for tool in poetry pre-commit flake8 pylint yamllint; do \
    pipx install "$tool"; \
    done \
    && gem install --no-document mdl \
    && playwright install-deps chromium \
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
