#!/bin/bash
echo "testing in progress"
new_path="$(yarn bin):$PATH"
export PATH="$new_path"

echo "making unit tests"
jest ../test

echo "making e2e tests"
jest --config ./test/jest-e2e.json

echo "retrieving coverage report"
jest --coverage