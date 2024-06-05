# OAuth2 in DTaaS

## **This document must provide general explanation of OAuth**

The DTaaS uses PKCE authorization flow for React client application and
web server authorization flow for traefik gateway. Please
an [explanation](https://aaronparecki.com/oauth-2-simplified)
of different oauth flows.

## Requirements

The installation requirements to run this docker version of the DTaaS are:

- You need to set up OAuth authorization on a GitLab server.
  The commercial gitlab.com is not suitable for multi-user authorization
  (DTaaS requires this), so you'll need an on-premise GitLab instance.
- You can use
  [GitLab Omnibus Docker for this purpose](https://docs.gitlab.com/ee/install/docker.html).
- Configure the OAuth application as an
  [instance-wide authorization type](https://docs.gitlab.com/ee/integration/oauth_provider.html#create-an-instance-wide-application).
  Select option to generate client secret and also selection option
  for trusted application.
- DNS name (optional, required only when the DTaaS is to be
- deployed on a web server)

## React Website Development Environment

There needs to be a valid callback and logout URLs for development and testing
purposes. You can use the same oauth application id for both development, testing
and deployment scenarios. Only the callback and logout URLs change. It is possible
to register multiple callback URLs in one oauth application. In order to use oauth
for development and testing on developer computer (localhost), you need to add the
following to oauth callback URL.

```txt
DTaaS application URL: http://localhost:4000
Callback URL: http://localhost:4000/Library
Logout URL: http://localhost:4000
```

The port 4000 is the default port for running the client website.
