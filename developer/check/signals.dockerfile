FROM node:26.10.0-slim AS build
RUN npm install --global --ignore-scripts yarn@1.22.22

WORKDIR /dtaas/signals
COPY ./servers/signals/ .
RUN YARN_ENABLE_SCRIPTS=false yarn install \
  --frozen-lockfile \
  --ignore-scripts \
  --network-timeout 1000000
RUN yarn build

FROM node:26.10.0-slim
RUN npm install --global --ignore-scripts yarn@1.22.22
WORKDIR /dtaas/signals
COPY --from=build --chown=node:node /dtaas/signals/dist ./dist
COPY --from=build --chown=node:node /dtaas/signals/node_modules ./node_modules
COPY --from=build --chown=node:node /dtaas/signals/package.json ./package.json

ENV SIGNALS_HOSTNAME=0.0.0.0
# The gateway writes nothing to disk and reads its configuration and secrets
# from read-only mounts, so it runs as node from the start.
USER node
EXPOSE 4004
CMD ["yarn", "start"]
