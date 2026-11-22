FROM node:26.10.0-slim AS build
RUN npm install --global --ignore-scripts yarn@1.22.22

WORKDIR /dtaas/execution-manager
COPY ./servers/execution/manager/ .
RUN YARN_ENABLE_SCRIPTS=false yarn install \
  --frozen-lockfile \
  --ignore-scripts \
  --network-timeout 1000000
RUN yarn build

FROM node:26.10.0-slim
WORKDIR /dtaas/execution-manager
COPY --from=build --chown=node:node /dtaas/execution-manager/dist ./dist
COPY --from=build --chown=node:node /dtaas/execution-manager/node_modules ./node_modules
COPY --from=build --chown=node:node /dtaas/execution-manager/package.json ./package.json

ENV EXECUTION_MANAGER_HOSTNAME=0.0.0.0
USER node
CMD ["node", "dist/src/main.js"]
