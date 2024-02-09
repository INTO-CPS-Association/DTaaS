# Single Docker Stack for DTaaS

We aim to build a single docker stack to deploy DTaaS. 

## Design

The compose.yml file in this directory is the single
file that can be used to deploy DTaaS.
It uses images already built and deployed on docker hub,
for the ML-workspace, client, LibMS and library.

It also incorporates an Auth MS for backend security. 

## Deploy

Use a simple command on the terminal.

### For a localhost deploy:
```bash
docker compose -f compose-localhost.yml --env-file .env up -d
```

### For a server deploy:
```bash
docker compose -f compose-server.yml --env-file .env up -d
```

## Points to note.

- You should have docker installed. Preferrably Docker Desktop. 
- The .env file is a sample file. Edit all the fields according to your specific case.
  You will need to have an OAuth application on a Gitlab instance.
  Refer to README.md for more info.

- Edit the localpath field in the deploy/config/lib.docker file
- No immediate changes required for env.local.js (Local deploy)
  / env.trial.js (server deploy) for testing and setup.

  For a prod situation, you will need to make changes to env.trial.js
  Refer to client/README.md for more info.

- Edits need to be made to servers/auth/conf file. 
  Refer to README.md for more info.


## Usage

### Localhost deploy
You can check if the docker stack is up using
<http:>http://localhost/whoami</http:>.

Then, head over to <http:>http://localhost/</http:>.
Sign in to gitlab instance with the your account.

All the functionality of DTaaS should be available to you
through the single page client now.

You may have to click Sign in to Gitlab on the Client page
and authorize access to the shown application.

### Server Deploy
You can check if the docker stack is up using
<http:>http://foo.com/whoami</http:>.

Then, head over to <http:>http://foo.com/</http:>.
Sign in to gitlab instance with the your account.

All the functionality of DTaaS should be available to you
through the single page client now.

You may have to click Sign in to Gitlab on the Client page
and authorize access to the shown application.