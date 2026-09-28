FROM node:26.10.0-slim AS build
RUN npm install --global --ignore-scripts yarn@1.22.22

WORKDIR /dtaas/runner
COPY ./servers/execution/runner/ .
RUN yarn install \
  --frozen-lockfile \
  --ignore-scripts \
  --network-timeout 1000000
RUN yarn build

FROM node:26.10.0-slim
WORKDIR /dtaas/runner
COPY --from=build --chown=node:node /dtaas/runner/dist ./dist
COPY --from=build --chown=node:node /dtaas/runner/node_modules ./node_modules
COPY --from=build --chown=node:node /dtaas/runner/package.json ./package.json

USER node
CMD ["node", "dist/src/main.js", "--config", "runner.yaml"]
