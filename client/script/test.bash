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
    printf "Running unit tests...\n"
    jest -c ./jest.config.json ../test/unitTests --coverage
    printf "Running integration tests ...\n"
    jest -c ./jest.integration.config.json ../test/integration
    yarn configapp test # Switch to testing env
    yarn start >/dev/null & # Start server in background. Suppress stderr.
    printf "\n\n################ Running Playwright ################"
    playwright test
    printf "Closing server on port 4000..."
    npx kill-port 4000
    yarn configapp dev
elif [ "$mode" == "-u" ]; then
    printf "Running unit tests only...\n"
    jest -c ./jest.config.json ../test/unitTests --coverage
elif [ "$mode" == "-i" ]; then
    printf "Running integration tests only...\n"
    jest -c ./jest.integration.config.json ../test/integration
elif [ "$mode" == "-e" ]; then
    printf "\n################ Running e2e tests ################\n"
    yarn configapp test # Switch to testing env
    yarn start >/dev/null & # Start server in background. Suppress stderr.
    printf "\n\n################ Running Playwright ################"
    playwright test
    printf "Closing server on port 4000..."
    npx kill-port 4000
    yarn configapp dev
else
    printf "Running unit tests only...\n"
    printf "Use -a for all tests, -u for unit tests, -i for integration tests or -e for e2e tests"
    jest -c ./jest.config.json ../test/unitTests --coverage
fi