#!/bin/bash
printf "starting the node application\n\n"

cross-env NODE_OPTIONS=--es-module-specifier-resolution=node \
  NODE_NO_WARNINGS=1 \
  node dist/src/runner.js
