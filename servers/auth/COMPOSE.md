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

```bash
docker compose --env-file .env up -d
```

## Points to note.

- You should have docker installed. Preferrably Docker Desktop. 
- The .env file is a sample file. Edit all the fields according to your specific case.
  You will need to have an OAuth application on a Gitlab instance.
  See README.md for more info on this.
- Edit the localpath field in the deploy/config/lib.docker file
- No immediate changes required for env.local.js (Local testing).
  For a prod situation, you will need to make changes to env.local.js
  Refer to client/README.md for more info.
- Edits need to be made to servers/auth/conf file. 
  Refer to servers/auth/README.md for more info.


## Usage

Once deployed, head to <http:>http://localhost</http:>.
Sign in to the gitlab instance with your account.

Then, head over to <http:>http://localhost/(your-username)</http:>.
Sign in to gitlab instance again with the same account.

All the functionality of DTaaS should be available to you
through the single page client now.

