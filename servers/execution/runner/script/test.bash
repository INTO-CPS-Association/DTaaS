#!/bin/bash

printf "testing in progress"
new_path="$(yarn bin):$PATH"
PATH="$new_path"
export PATH

if [ "$1" == "nocoverage" ]; then
  COV_FLAG="false"
  WATCH_FLAG=""
elif [ "$1" == "watchAll" ]; then
  COV_FLAG="true"
  WATCH_FLAG="--watchAll"
else
  COV_FLAG="true"
  WATCH_FLAG=""
fi

npx cross-env NODE_OPTIONS=--experimental-vm-modules \
  NODE_NO_WARNINGS=1 \
  jest --coverage="${COV_FLAG}" "$WATCH_FLAG"
