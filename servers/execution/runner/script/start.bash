#!/bin/bash
printf "starting the node application\n\n"

#npx cross-env NODE_OPTIONS="--es-module-specifier-resolution=node  --experimental-modules --experimental-specifier-resolution=node" NODE_NO_WARNINGS=1 node dist/src/main.js

MOD_RES="--es-module-specifier-resolution=node"
EXP="--experimental-modules"
EXP_RES="--experimental-specifier-resolution=node"
npx cross-env \
  NODE_OPTIONS="$MOD_RES $EXP $EXP_RES" \
  NODE_NO_WARNINGS=1 \
  node dist/src/main.js
#  node dist/src/runner.js
