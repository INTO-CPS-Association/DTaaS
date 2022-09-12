echo "\n\n################ Testing in progress ################"
echo "\n################ Running Jest ################"
export PATH="$(yarn bin):$PATH"
jest .

yarn start &
echo "\n\n################ Running Playwright ################"
playwright test
