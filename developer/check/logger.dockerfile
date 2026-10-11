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
RUN npm install --global --ignore-scripts yarn@1.22.22
WORKDIR /dtaas/logger
COPY --from=build --chown=node:node /dtaas/logger/dist ./dist
COPY --from=build --chown=node:node /dtaas/logger/node_modules ./node_modules
COPY --from=build --chown=node:node /dtaas/logger/package.json ./package.json
RUN mkdir -p logs && chown node:node logs
COPY --chmod=755 ./servers/logger/docker-entrypoint.sh /usr/local/bin/logger-entrypoint

ENV LOGGER_HOSTNAME=0.0.0.0
ENV LOGGER_LOG_FILE_PATH=/dtaas/logger/logs/workflow-logs.jsonl
# Starts as root only to fix the log directory owner, then runs as node.
ENTRYPOINT ["logger-entrypoint"]
CMD ["yarn", "start"]
