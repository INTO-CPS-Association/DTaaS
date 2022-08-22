echo "\n\n################ Testing in progress ################"
echo "\n################ Running Jest ################"
export PATH="$(yarn bin):$PATH"
jest .

echo "\n\n################ Running Playwright ################"
playwright test