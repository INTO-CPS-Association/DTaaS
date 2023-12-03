# Traefik Auth Microservice - Demo

A basic demo version of the Traefik proxy & Authentication microservice is presented here. 
This demo uses docker for running the microservice. Within docker, images of the following container are used:

- traefik - As the reverse proxy/ edge of our system
- thomseddon/traefik-forward-auth - That works as an authentication server, with Gitlab as the OAuth provider. 
- whoami - A tiny server which return information about your OS/IP. This is an example version of any microservice that should lie behind the OAuth.

## Example Rules

- The objective is to be able to acces the information returned by the whoami server. This information is available as http://localhost/os , but only after successful OAuth. 

- The OAuth works on the simple rule that any "xyz@gmail.com" email IDs registed with Gitlab are allowed. Any other gitlab accounts, like "pqr@domain.com" (where domain is not gmail) are not allowed. 

- There are various and flexible rules. These can also be turned of to allow any email ID registered with GitLab to pass through. 

## Run the example

You should have docker setup to be able to run this. Docker Desktop for Linux is preferred.

- Clone/Pull the DTaaS repo
- To avoid any volume mount errors, please open up the servers/auth/compose.yml file and change the path in services: traefik-forward-auth: volumes: 
  to the correct file path of the servers/auth/conf file on your system
- In your terminal, change directory to this auth directory, 
- Run:

```bash
docker compose up -d --remove-orphans
```

The microservice is now running. 


## View the example

- Head over to http://localhost/os
- You will be redirected to Gitlab. Sign in if you aren't already signed in. Use a "xyz@gmail.com" account on Gitlab to sign in. 
- On Gitlab you will be asked to authorize sharing some account data with a "TrialAuth" application. Click on the "Authorize" button. 
- You will be redirect to the whoami server page showing information about your system.

### Logout

- To logout (o.e. require re-authentication to access services), simply head over to http://localhost/_oauth/logout
- You should be redirected to https://www.google.com/ . This confirms successful logout.

### Test: When you logout.

- Logout by heading over to http://localhost/_oauth/logout 
- To test if this works, **first logout of Gitlab**. This is required because if you are signed into Gitlab, although an exchange of new access tokens will occur, 
it may not be evident as you will be auto-signedin to Gitlab.
- Now, head over to http://localhost/os. You will have to go through the Auth process again now. 
- Once you've passed OAuth, you will be shown the server page.

### Test: When you don't logout

- Close the whoami server page tabs (if any are open).
- Do not logout this time. 
- Again, **logout of Gitlab**. (To maintain consistency of the test)
- Head over to http://localhost/os. 
- You will automatically be able to see this page, without any Auth process/ new access tokens. 
- This page is still visible even though you have logged out of Gitlab. This is because you haven't logged out of the OAuth.  

## Additional tests

- Try repeating the process, this time sign in with non Gmail email ID account into Gitlab. You will not be redirected to the whoami server page. Instead, you should see a Not Authorized message.

- Now, try heading over to http://localhost/public. This is a public, accessible to all, copy of the same webserver. It still passes through the AuthServer (traefik-forward-auth), however this Path is set to allow access to all, instead of any authentication. You should be able to see this page with any email ID/ even without signing in.

## Further work 

- This is a Proof Of Concept. It will now be integrated with DTaaS, and all microservices that require OAuth will be added behind this Authentication, only accesible through the Traefik reverse proxy. 

