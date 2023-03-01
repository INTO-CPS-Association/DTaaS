printf "\n\n################ Testing in progress ################"
printf "\n################ Running Jest ################\n"
export PATH="$(yarn bin):$PATH"
jest .

# { { yarn start 2>&3 || [ $? -eq 137 ]; } 3>&2 2>/dev/null & } <-- Does not work. Trying to only suppress error 137.
yarn start 2>/dev/null & # Start server in background. Suppress stderr.
printf "\n\n################ Running Playwright ################"
playwright test
printf "Closing server on port 4000..."
npx kill-port 4000
# TODO: Port should be dynamic. Perhaps saving it in env variable? If applicable for windows.
