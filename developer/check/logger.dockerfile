FROM node:26.10.0-slim AS build
RUN npm install --global --ignore-scripts yarn@1.22.22

WORKDIR /dtaas/logger
COPY ./servers/logger/ .
RUN YARN_ENABLE_SCRIPTS=false yarn install \
  --frozen-lockfile \
  --ignore-scripts \
  --network-timeout 1000000
RUN yarn build

FROM node:26.10.0-slim
# The service generates its self-signed certificate with openssl.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global --ignore-scripts yarn@1.22.22
WORKDIR /dtaas/logger
COPY --from=build --chown=node:node /dtaas/logger/dist ./dist
COPY --from=build --chown=node:node /dtaas/logger/node_modules ./node_modules
COPY --from=build --chown=node:node /dtaas/logger/package.json ./package.json
COPY --chmod=755 developer/check/logger-entrypoint.sh /usr/local/bin/logger-entrypoint
RUN mkdir -p logs certs && chown node:node logs certs

ENV LOGGER_HOSTNAME=0.0.0.0
ENV LOGGER_LOG_FILE_PATH=/dtaas/logger/logs/workflow-logs.jsonl
ENV LOGGER_CERTS_DIR=/dtaas/logger/certs
# No USER instruction on purpose: the container starts as root only so
# the entrypoint can give the bind-mounted directories, which Docker
# creates as root, to node. It then drops to node before the service runs.
ENTRYPOINT ["logger-entrypoint"]
CMD ["yarn", "start"]
