#!/bin/bash
printf "testing in progress"
new_path="$(yarn bin):$PATH"
export PATH="$new_path"
test_path=$(pwd)/test/data
export TEST_PATH="$test_path"
# Get the first argument passed to the script
mode=$1

if [ "$mode" == "-a" ]; then
  printf "making all tests ... and retrieving coverage report"
  jest --coverage
elif [ "$mode" == "-u" ]; then
  printf "making unit tests"
  jest ../test/unit
elif [ "$mode" == "-i" ]; then
  printf "making integration tests"
  jest ../test/integration
elif [ "$mode" == "-e" ]; then
  printf "making e2e tests"
  jest --config ./test/jest-e2e.json
else
  printf "Invalid option. Please use -a for all tests, -u for unit tests, -i for integration tests, or -e for e2e tests."
fi