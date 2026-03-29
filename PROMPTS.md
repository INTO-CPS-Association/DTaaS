# Session Prompts

Collected from this session in chronological order.

## Prompt 1

I am looking for a software utility that can take git ssh key / token, remote url and do bidirectional sync in the background. Show me four alternatives.

## Prompt 2

The "yarn test:e2e" are failing. If a test passes with at least one browser it may be considered a success. Fix the problem.

## Prompt 3

You misunderstood the requirement. Run the tests for both the browsers. The e2e tests are brittle. Sometimes a single e2e test passes for firefox but fails for chromium. Sometimes, it is the other way around. A single test should be considered a success it passes successfully in at least a single browser. I reverted the changes made by you.

Continue to update the code in client/src and client/test until all the e2e tests pass. Once the tests are successful, check the following yarn commands again
yarn syntax
yarn format
yarn build
yarn test:unit
yarn test:int
yarn test:e2e

Fix any problems as they arise and iterate through the yarn commands.

