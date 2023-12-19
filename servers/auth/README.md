# Traefik Auth Microservice - Demo

A basic demo version of the Traefik proxy & Authentication microservice is presented here.
This demo uses docker for running the microservice.
Within docker, images of the following container are used:

- traefik - As the reverse proxy/ edge of our system
- thomseddon/traefik-forward-auth - That works as an authentication server, with Gitlab as the OAuth provider.
- whoami - A tiny server which return information about your OS/IP.
  This is an example version of any microservice that should lie behind the OAuth.


## Run the example

You should have docker setup to be able to run this.
Docker Desktop for Linux is preferred.

- Clone/Pull the DTaaS repo
- In your terminal, change directory to this auth directory.
- This service works based on 2 files, servers/auth/compose.yml and servers/auth/conf.
- In the compose.yml, under the traefik-forward-auth service volumes,
  please replace the correct file path for servers/auth/conf file (on the left hand side of ':').
- Also fill in the CLIENT_ID, CLIENT_SECRET fields. 
- No other changes should be made to compose.yml.

- Run:

```bash
docker compose up -d --remove-orphans
```

The microservice is now running.

## View the example

- Try heading over to http://localhost/public.
  This is a public, accessible to all, copy of the webserver.
  It still passes through the AuthServer (traefik-forward-auth),
  however this Path is set to allow access to all, instead of any authentication.
  You should be able to see this page with any email ID/ even without signing in.

- Head over to http://localhost/os. This page requires Gitlab OAuth and is not public.
- You will be redirected to Gitlab. Sign in if you aren't already signed in.
  user1 (user1@localhost) /user2 (user2@localhost) accounts can be used to sign into the Gitlab instance.
- On Gitlab you will be asked to authorize sharing some account data with a "AuthTry" application.
  Click on the "Authorize" button. 
- You will be redirect to the whoami server page showing information about your system.
  Any account that passes the Gitlab OAuth or the specific instance is allowed access.

### Selective access

- Users can be selectively allowed to access some resources.
  If you signed in with user1, try to visit http://localhost/user1.
- This wouldn't be accessible if you signed in using user2 account.
- If you signed in using user1 account, try visiting http://localhost/user2.
  You should recieve a Not Authorized message, and access will be restricted.

### Logout

- To logout (o.e. require re-authentication to access services),
  simply head over to http://localhost/_oauth/logout
- You should be redirected to https://www.google.com/ . This confirms successful logout.

### Test: When you logout.

- Logout by heading over to http://localhost/_oauth/logout 
- To test if this works, **first logout of Gitlab**.
  This is required because if you are signed into Gitlab, although an exchange of new access tokens will occur,
  it may not be evident as you will be auto-signedin to Gitlab.
- Now, head over to http://localhost/os. You will have to go through the Auth process again now.
- Once you've passed OAuth, you will be shown the server page.

### Test: When you don't logout

- Close the whoami server page tabs (if any are open).
- Do not logout this time.
- Again, **logout of Gitlab**. (To maintain consistency of the test)
- Head over to http://localhost/os.
- You will automatically be able to see this page, without any Auth process/ new access tokens.
- This page is still visible even though you have logged out of Gitlab.
  This is because you haven't logged out of the OAuth.


## Configuration

The conf file can be used to configure the specific rules.

- To setup a public page, an example is shown below.

  ```text
  rule.noauth.action=allow
  rule.noauth.rule=Path(`/public`)
  ```

  Here, 'noauth' is the rule name, and should be changed to suit rule use.
  Rule names should be unique for each rule.
  The 'action' property is set to "allow" to make the resource public.
  The 'rule' property defines the path/route to reach the resource.

- To setup a common page that requires Gitlab OAuth, but is available to all users of the Gitlab instance:

  ```text
  rule.all.action=auth
  rule.all.rule=Path(`/os`)
  ```

The 'action' property is set to "auth", to enable Gitlab OAuth before the resource can be accessed.

- To setup selective access to a page:

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
 

## Further work

- This is a working demo. It will now be integrated with DTaaS,
  and all microservices that require OAuth will be added behind this Authentication,
  only accesible through the Traefik reverse proxy.
- Please refer to https://github.com/thomseddon/traefik-forward-auth.
  This microservice is based on this repository.

## Disclaimer

The server currently has a 8 second timeout on requests.
This might cause some requests to timeout, usually due to internet connectivity
and recieve a 503 - Service Unavailable. 
Please try again in case this happens.
This is an open issue.
