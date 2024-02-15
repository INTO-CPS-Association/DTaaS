# Single Docker Stack for DTaaS

We provide here a single docker stack to deploy DTaaS.

## Design

The compose-localhost.yml file in this directory is the single
file that can be used to deploy DTaaS on localhost (locally).

The compose-localhost.yml file in this directory is the single
file that can be used to deploy DTaaS on a dedicated server 
with a valid DNS.

The files use images already built and deployed on docker hub,
for the ML-workspace, client, and LibMS.

It also incorporates an Auth MS for backend security.

## Steps to follow before deploy

-  You should have docker installed. Preferrably Docker Desktop.
-  You need an
  [instance-wide authentication type](https://docs.gitlab.com/ee/integration/oauth_provider.html#create-an-instance-wide-application)
  on Gitlab. For the below discussion , <https://gitlab.foo.com>
  has been used as example URL of OAuth provider.
- Create an OAuth application client on your gitlab instance.
  Note the client ID and client Secret for the same.
- The .env file is a sample file. It contains environment variables
  that are used by the docker compose files.
  Edit all the fields according to your specific case.

  | URL Path | Access Granted to |Access Granted to |
  |:------------|:---------------|:---------------|
  | DTAAS_DIR | '/home/Desktop/DTaaS' | Full path to the DTaaS directory
  | SERVER_DNS | 'foo.com' | The server dns, if you are using a dedicated server for deploy
  | BASE_URL | 'https://gitlab.foo.com' | The URL of your Gitlab instance
  | CLIENT_ID | 'xx' | The ID of your OAuth application
  | CLIENT_SECRET | 'xx' | The Secret of your OAuth application
  | OAUTH_SECRET | 'random-secret-string' | Any private random string
  | username1 | 'user1' | The gitlab instance username of a user of DTaaS
  | username2 | 'user2' | The gitlab instance username of a user of DTaaS
  | ENV_JS_FILEPATH | '/home/Desktop/DTaaS/deploy/config/client/env.js' | Full path to env.js file for client

- Setup the client env.js file.
  deploy/config/client/env.local.js can be used for 
  a localhost deploy without any changes.
  For a prod situation, you  can make make changes to 
  the sample file deploy/config/client/env.trial.js
  Refer to client/README.md for more info.
- Edits need to be made to servers/auth/conf file.
  Refer to the below section for more info.

## Configure Authorization Rules for AuthMS

The Traefik forward auth microservices requires configuration rules to manage
authentication for different URL paths.
The `conf` file can be used to configure the specific rules.
There are broadly three kinds of URLs:

### Public Path Without Authentication

To setup a public page, an example is shown below.

```text
rule.noauth.action=allow
rule.noauth.rule=Path(`/public`)
```

Here, 'noauth' is the rule name, and should be changed to suit rule use.
Rule names should be unique for each rule.
The 'action' property is set to "allow" to make the resource public.
The 'rule' property defines the path/route to reach the resource.

### Common to All Users

To setup a common page that requires Gitlab OAuth,
but is available to all users of the Gitlab instance:

```text
rule.all.action=auth
rule.all.rule=Path(`/os`)
```

The 'action' property is set to "auth", to enable Gitlab
OAuth before the resource can be accessed.

### Selective Access

Selective Access refers to the scenario of allowing access to a URL path
for a few users. To setup selective access to a page:

```text
rule.onlyu1.action=auth
rule.onlyu1.rule=Path(`/user1`)
rule.onlyu1.whitelist = user1@localhost
```

The 'whitelist' property of a rule defines a comma separated list
of email IDs that are allowed to access the resource.
While signing in users can sign in with either their username or email ID
as usual, but the email ID corresponding to the
account should be included in the whitelist.

This restricts access of the resource,
allowing only users mentioned in the whitelist.

### Limitation

The rules in _conf_ file are not dynamically loaded into
the **traefik-forward-auth** microservice.
Any change in the _conf_ file requires
retart of **traefik-forward-auth** for the changes to take effect.
All the existing user sessions get invalidated when
the **traefik-forward-auth** restarts.

## Deploy

Use a simple command on the terminal.

### For a localhost deploy

```bash
docker compose -f compose-localhost.yml --env-file .env up -d
```

### For a server deploy

```bash
docker compose -f compose-server.yml --env-file .env up -d
```

## Usage

### Localhost deploy

Then, head over to <http:>http://localhost/</http:>.
Sign in to gitlab instance with the your account.

All the functionality of DTaaS should be available to you
through the single page client now.

You may have to click Sign in to Gitlab on the Client page
and authorize access to the shown application.

### Server Deploy

Then, head over to <http:>http://foo.com/</http:>.
Sign in to gitlab instance with the your account.

All the functionality of DTaaS should be available to you
through the single page client now.

You may have to click Sign in to Gitlab on the Client page
and authorize access to the shown application.
