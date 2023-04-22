#!/bin/bash
printf "\n\n################ Testing in progress ################"
printf "\n################ Running Jest ################\n"
PATH="$(yarn bin):$PATH"
export PATH
jest .

# { { yarn start 2>&3 || [ $? -eq 137 ]; } 3>&2 2>/dev/null & } <-- Does not work. Trying to only suppress error 137.
yarn start >/dev/null & # Start server in background. Suppress stderr.
printf "\n\n################ Running Playwright ################"
playwright test
printf "Closing server on port 4000..."
npx kill-port 4000
