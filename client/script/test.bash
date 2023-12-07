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

case "$mode" in
    -a)
        printf "\n################ Running all tests ################\n"
        yarn test:all
        ;;
    -u)
        printf "Running unit tests only...\n"
        yarn test:unit
        ;;
    -i)
        printf "Running integration tests only...\n"
        yarn test:int
        ;;
    -e)
        printf "\n################ Running e2e tests ################\n"
        yarn test:e2e
        ;;
    *)
        printf "Running unit tests only...\n"
        printf "Use -a for all tests, -u for unit tests, -i for integration tests, or -e for e2e tests"
        yarn test:unit
        ;;
esac
