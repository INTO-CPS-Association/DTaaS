#!/bin/bash
set -eux
printf "\n\n################ Testing in progress ################"
printf "\n################ Running Jest ################\n"
PATH="$(yarn bin):$PATH"
export PATH
jest .

if [ -z "${1+x}" ]; then
    mode="unit-tests"  # Default mode if no argument passed
else 
    mode=$1
fi

if [ "$mode" == "-a" ] || [ "$mode" == "-e" ]; then
    yarn start >/dev/null & # Start server in background. Suppress stderr.
    printf "\n\n################ Running Playwright ################"
    playwright test
    printf "Closing server on port 4000..."
    npx kill-port 4000
elif [ "$mode" == "unit-tests" ]; then
    printf "Unit tests completed. Use -a or -e for e2e tests.\n"
else
    printf "Invalid argument. Use -a or -e for e2e tests.\n"
fi
    printf "Invalid argument. Use -a for e2e tests.\n"
fi