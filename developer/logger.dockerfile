FROM node:24.12.0-slim as build

WORKDIR /dtaas/logger
COPY ./servers/logger/ .
RUN yarn install --immutable --immutable-cache --check-cache --network-timeout 1000000
RUN yarn build

FROM node:24.12.0-slim
COPY --from=build /dtaas/logger/dist /dtaas/logger/dist
COPY --from=build /dtaas/logger/node_modules /dtaas/logger/node_modules
COPY --from=build /dtaas/logger/package.json /dtaas/logger/package.json

WORKDIR /dtaas/logger
ENV LOGGER_LOG_FILE_PATH=/dtaas/logger/logs/workflow-logs.jsonl
CMD ["yarn", "start"]
