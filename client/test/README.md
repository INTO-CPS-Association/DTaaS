# End-to-End (e2e) Testing Setup
To properly set up your testing environment for running the end-to-end tests in our application you must follow the _configuration setup_ steps.

## Configuration Setup
To successfully run the end-to-end tests, you need to create a .env file where you will store your GitLab user credentials. These credentials will be used to simulate real user interactions during the e2e tests.

Follow these steps to create and configure your .env file:

Inside of the _test_ folder of the project, create a new file and name it .env. So the path should be client/test/.env

Open the .env file in a text editor and add the following environment variables:

```
REACT_APP_TEST_USERNAME=your_username
REACT_APP_TEST_PASSWORD=your_password
```
Replace _your_username_ and _your_password_ with the actual username and password of your GitLab account or the testing account that you intend to use.

Here's an example:

```
REACT_APP_TEST_USERNAME=TestUsername
REACT_APP_TEST_PASSWORD=TestPassword123
```
## Configuring the Test.js File
Before running the end-to-end tests, you might need to make some changes to the `config/test.js` file. You'll find this file in the client directory of the project.

Open `config/test.js` in a text editor and make sure the configuration matches the details of your testing environment. For instance, you may need to adjust the `REACT_APP_URL` and `REACT_APP_REDIRECT_URI` settings to match the local development URL, or adjust other settings according to your needs.

For more information on about the environment settings go to the `docs/user/client/README.md`

## Running the Tests
Once you've properly set up your .env file, you can now run the end-to-end tests.

```
yarn test -e
```
This command launches the test runner and executes all end-to-end tests. Make sure you have an active internet connection while running these tests, as they simulate real user interactions with your GitLab account.