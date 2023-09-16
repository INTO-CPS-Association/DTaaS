#!/bin/bash

printf "testing in progress"
new_path="$(yarn bin):$PATH"
export PATH="$new_path"

npx cross-env NODE_OPTIONS=--experimental-vm-modules \
  NODE_NO_WARNINGS=1 \
  jest --coverage "$1"
