# Traefik Auth Microservice - Demo

A basic demo version of the Traefik proxy &
Authentication microservice is presented here.
This demo uses docker for running the microservice.
Within docker, images of the following container are used:

- traefik - As the reverse proxy/ edge of our system
- thomseddon/traefik-forward-auth - That works as an
  authentication server, with Gitlab as the OAuth provider.
- whoami - A tiny server which return information about your OS/IP.
  This is an example version of any microservice
  that should lie behind the OAuth.

## Ready Reckoner

You need an
[instance-wide authentication type](https://docs.gitlab.com/ee/integration/oauth_provider.html#create-an-instance-wide-application)
on Gitlab. If you use <https://gitlab.com> as your authentication provider,
you can only authenticate a single user. For the table below, <https://gitlab.foo.com>
has been used as example URL of OAuth provider

| Gitlab Variable Name | Variable name in compose.yml          | Default Value                            |
| :------------------- | :------------------------------------ | :----------------------------------------|
| OAuth Provider       | PROVIDERS_GENERIC_OAUTH_AUTH_URL      | <https://gitlab.foo.com/oauth/authorize> |
|                      | PROVIDERS_GENERIC_OAUTH_TOKEN_URL     | <https://gitlab.foo.com/oauth/token>     |
|                      | PROVIDERS_GENERIC_OAUTH_USER_URL      | <https://gitlab.foo.com/api/v4/user>     |
| Application ID       | PROVIDERS_GENERIC_OAUTH_CLIENT_ID     |                                          |
| Secret               | PROVIDERS_GENERIC_OAUTH_CLIENT_SECRET |                                          |
| Callback URL         |                                       | <http://localhost/_oauth>                |
| Scopes               |                                       | read_user                                |
| Logout URL for demo  |                                       | <http://localhost/_oauth/logout>         |
||

## Configure Authentication Rules

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
the **traefik-forward-auth** microservice. Any change in the _conf_ file requires
retart of **traefik-forward-auth** for the changes to take effect.
All the existing user sessions get invalidated when
the **traefik-forward-auth** restarts.

## Run the example

You should have docker setup to be able to run this.
Docker Desktop for Linux is preferred.

- Clone/Pull the DTaaS repo
- In your terminal, change directory to this auth directory.
- This service works based on 2 files,
  servers/auth/compose.yml and servers/auth/conf.
- In the compose.yml, under the traefik-forward-auth service volumes,
  please replace the correct absolute file path for
  servers/auth/conf file in the volume mapping of
  **traefik-forward-auth** container..
- Also fill in the OAUTH details in compose.yml as per the table given above.
- No other changes should be made to compose.yml.

- Finally, run:
  
  ```bash
  docker compose up -d --remove-orphans
  ```

The microservices start up and provide access to
the following URL paths.

| URL Path | Access Granted to |
|:------------|:---------------|
| <http://localhost/public> | everyone including unauthenticated users |
| <http://localhost/os> | user1 and user2 |
| <http://localhost/user1> | user1 |
| <http://localhost/user2> | user2 |
||

## View the example

### Public

Try heading over to <http://localhost/public>.
This is a public, accessible to all, copy of the webserver.
It still passes through the AuthServer (traefik-forward-auth),
however this Path is set to allow access to all,
instead of any authentication.
You should be able to see this page without even signing in.

### Authenticated users

- Head over to <http://localhost/os>.
  This page requires Gitlab OAuth and is not public.
- You will be redirected to Gitlab. Sign in if you aren't already signed in.
  _user1 (user1@localhost) / user2 (user2@localhost)_
  accounts can be used to sign into the Gitlab instance.
- On Gitlab you will be asked to authorize sharing some
  account data for the <http://localhost> application.
  Click on the **Authorize** button.
- You will be redirect to the whoami server page
  showing information about your system.
  Any account that passes the Gitlab OAuth or
  the specific instance is allowed access.

### Selective access

- Users can be selectively allowed to access some resources.
  If you signed in with user1, try to visit <http://localhost/user1>.
- This wouldn't be accessible if you signed in using user2 account.
- If you signed in using user1 account, try visiting <http://localhost/user2>.
  You should recieve a Not Authorized message, and access will be restricted.

### Logout

- To logout (o.e. require re-authentication to access services),
  simply head over to <http://localhost/_oauth/logout>
- You should be redirected to <https://www.google.com/>.
  This confirms successful logout.

### Test: When you logout

- Logout by heading over to <http://localhost/_oauth/logout>
- To test if this works, **first logout of Gitlab**.
  This is required because if you are signed into Gitlab,
  although an exchange of new access tokens will occur,
  it may not be evident as you will be auto-signedin to Gitlab.
- Now, head over to <http://localhost/os>.
  You will have to go through the Auth process again now.
- Once you've passed OAuth, you will be shown the server page.

### Test: When you don't logout

- Close the whoami server page tabs (if any are open).
- Do not logout this time.
- Again, **logout of Gitlab**. (To maintain consistency of the test)
- Head over to <http://localhost/os>.
- You will automatically be able to see this page,
  without any Auth process/ new access tokens.
- This page is still visible even though you have logged out of Gitlab.
  This is because you haven't logged out of the OAuth session
  managed by traefik forward auth.

## Adding/Removing a service

To remove an existing service. Remove it's
entire configuration from the compose.yml file,
and then run:

```bash
docker compose up -d --remove-orphans
```

This will remove the service.

To add a new service/remove an existing service,
set the service up as you normally would in the
docker compose with traefik as the gateway.

Simply run

```bash
docker compose up -d
```

for the service to take effect. To add OAuth to
this service, follow the next section.

## Updating Configuration

### Adding OAuth to a new service

The current compose.yml file has a "dummy" service.
Currently, this service doesn't have any OAuth applied to it
as the traefik-forward-auth isn't applied as a middleware to it's route.

To add OAuth to this service, add the following into the labels of the service.

```yaml
- "traefik.http.routers.dummy2.middlewares=traefik-forward-auth"
```

In your terminal, recreate this changed service.

```bash
docker compose up -d --force-recreate dummy
```

Here, "dummy" is the service name.

This adds Gitlab OAuth to the service.

### Adding selective access to service

Till now, the Gitlab OAuth has been added to the dummy service.
This allows **any** users that complete the Gitlab Instance sign in,
to have access to the service.

To restrict access based on user identity, we need to add
appropriate rules to the _servers/auth/conf_ file.

Let's say we want only user2 (user2@localhost) to have access
to this new dummy service. Add the following to the conf file:

```text
rule.dummy.action=auth
rule.dummy.rule=Path(`/user2`)
rule.dummy.whitelist = user2@localhost
```

The traefik-forward-auth service is based on static rules.
Thus simply adding these rules to the conf file doesn't make
them take effect immediately.

You will need to recreate the traefik-forward-auth container
any time you update the conf file.

```bash
docker compose up -d --force-recreate traefik-forward-auth
```

This updates the rules being used, and now only user2 will have
access to the dummy service.

## Further work

- This is a working demo. It will now be integrated with DTaaS,
  and all microservices that require OAuth will be added
  behind this Authentication,
  only accesible through the Traefik reverse proxy.
- Dynamic rule addition is also an open issue.
- The Traefik Forward Auth code is available
  [online](https://github.com/thomseddon/traefik-forward-auth).

## Disclaimer

There is an 8 second timeout on OAuth requests sent to Gitlab.
If the OAuth signin process is not complete before eight seconds,
Gitlab cancels the signin request and gives
```503 - Service Unavailable``` message.
The timelimit variable has not been found in gitlab.rb config file;
timelimit is probably built into Gitlab code.
