#!/bin/bash
printf "\n\n################ Testing in progress ################"
printf "\n################ Running Jest ################\n"
PATH="$(yarn bin):$PATH" # Add yarn bin to path
export PATH
jest .

JEST_EXIT_CODE=$?
if [ $JEST_EXIT_CODE -ne 0 ]; then
    printf "\n\n################ Jest tests failed ################"
    exit 1
fi

# { { yarn start 2>&3 || [ $? -eq 137 ]; } 3>&2 2>/dev/null & } <-- Does not work. Trying to only suppress error 137.
yarn start >/dev/null & # Start server in background. Suppress stderr.
printf "\n\n################ Running Playwright ################"
playwright test
PLAYWRGHT_EXIT_CODE=$?

printf "Closing server on port 4000..."
npx kill-port 4000

if [ $PLAYWRGHT_EXIT_CODE -ne 0 ]; then
    printf "\n\n################ Playwright tests failed ################"
    exit 1
fi
