#!/bin/bash

printf "testing in progress"
new_path="$(yarn bin):$PATH"
export PATH="$new_path"

cross-env NODE_OPTIONS=--experimental-vm-modules \
  NODE_NO_WARNINGS=1 \
  jest --coverage
