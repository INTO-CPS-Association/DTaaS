#!/bin/bash
set -eux
printf "\n\n################ Testing in progress ################"
printf "\n################ Running Jest ################\n"
PATH="$(yarn bin):$PATH"
export PATH

if [ -z "${1+x}" ]; then
    mode="unit-tests"  # Default mode if no argument passed
else 
    mode=$1
fi

if [ "$mode" == "-a" ]; then
    printf "\n################ Running all tests ################\n"
    jest ../test/unitTests --coverage
    yarn start >/dev/null & # Start server in background. Suppress stderr.
    printf "\n\n################ Running Playwright ################"
    playwright test
    printf "Closing server on port 4000..."
    npx kill-port 4000
elif [ "$mode" == "-u" ] or [ "$mode" == "-unit-tests" ]; then
    printf "Running unit tests only...\n"
    jest ../test/unitTests
elif [ "$mode" == "-e" ]; then
    printf "\n################ Running e2e tests ################\n"
    yarn start >/dev/null & # Start server in background. Suppress stderr.
    printf "\n\n################ Running Playwright ################"
    playwright test
    printf "Closing server on port 4000..."
    npx kill-port 4000
else
    printf "Running unit tests only...\n"
    printf "Use -a for all tests, -u for unit tests or -e for e2e tests"
    jest ../test/unitTests
fi