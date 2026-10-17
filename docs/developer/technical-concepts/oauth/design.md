# System Design of DTaaS Authorization Microservice

DTaaS needs backend authorization to protect its backend services and user
workspaces. This page describes the system design of the DTaaS Auth
Microservice, which provides it.

## Requirements

The Auth MS only has to answer requests of the general form "Is User X
allowed to access /BackendMS/example?".

If the GitLab OAuth 2.0 provider verifies the user's identity AND the user
is allowed to access the requested microservice or action, the Auth MS
responds with a 200 (OK) code and lets the request pass through the gateway
to the microservice or server.

If identity verification through GitLab OAuth 2.0 fails OR the user is not
permitted to access the requested resource, the Auth MS responds with a 40X
(NOT OK) code and stops the request.

## Forward Auth Middleware in Traefik

Traefik lets you attach middlewares to the routes configured in it. A
middleware intercepts requests on a route and can analyse or modify them
before passing them on to the services. Traefik's ForwardAuth middleware
delegates authentication to an external service. If the external
authentication server responds with a 2XX code, the middleware acts as a
proxy and lets the request through to the service. If the external server
responds with any other code, the middleware drops the request and returns
that response code to the user.

![Forward Auth middleware](traefik-forward-auth-middleware.png)
(source:
[Traefik documentation](https://doc.traefik.io/traefik/middlewares/http/forwardauth/))

An Auth Microservice can therefore be added to the existing gateway and
DTaaS system by making it the external authentication server for
ForwardAuth middlewares. These middlewares can be attached to any route
that needs authentication. DTaaS attaches it to all routes, because the
platform requires at least identity verification for every request through
the gateway.

## Auth MS Design

The sequence diagram shows how the integrated Auth MS works.

![authorization sequence diagram](design-sequence.png#only-light)
![authorization sequence diagram](design-sequence-dark.png#only-dark)

- The user makes every request through the React website, the frontend of
  the DTaaS platform.

- The request goes through the Traefik gateway, where the route's
  ForwardAuth middleware intercepts it.

- The middleware asks the Auth MS whether this request from this user
  should be allowed.

- The Auth MS (the auth server) verifies the user's identity using OAuth
  2.0 with GitLab, and checks whether the user may make this request.

- If the user is verified and allowed to make the request, the auth server
  responds with 200 OK to the Traefik gateway (more precisely, to the
  middleware in Traefik).

- Traefik then forwards the request to the service. Any response from the
  service passes back along the chain to the user.

- If the user is not verified or not allowed to make the request, the auth
  server responds with a 40X code to the Traefik gateway.

- Traefik then drops the request and tells the client that the request was
  forbidden, passing on the auth server's response code.
