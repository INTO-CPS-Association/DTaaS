FROM node:24.12.0-slim AS build

WORKDIR /dtaas/logger
COPY ./servers/logger/ .
RUN YARN_ENABLE_SCRIPTS=false yarn install \
  --frozen-lockfile \
  --ignore-scripts \
  --network-timeout 1000000
RUN yarn build

FROM node:24.12.0-slim
WORKDIR /dtaas/logger
COPY --from=build --chown=node:node /dtaas/logger/dist ./dist
COPY --from=build --chown=node:node /dtaas/logger/node_modules ./node_modules
COPY --from=build --chown=node:node /dtaas/logger/package.json ./package.json
RUN mkdir -p logs && chown node:node logs

ENV LOGGER_HOSTNAME=0.0.0.0
ENV LOGGER_LOG_FILE_PATH=/dtaas/logger/logs/workflow-logs.jsonl
USER node
CMD ["yarn", "start"]
