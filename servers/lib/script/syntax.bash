#!/bin/bash
new_path="$(yarn bin):$PATH"
export PATH="$new_path"
echo "Running eslint"
eslint .
