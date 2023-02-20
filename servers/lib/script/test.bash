echo "testing in progress"
export PATH="$(yarn bin):$PATH"

echo "making unit tests"
jest ../test

#echo "making e2e tests"
#jest --config ./test/jest-e2e.json

#echo "retrieving coverage report"
#jest --coverage
