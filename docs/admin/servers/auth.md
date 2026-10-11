# OAuth 2.0 for Traefik Gateway

The Traefik gateway serves the DTaaS, and it secures every service
that is part of the application. The security is based on [Traefik forward-auth](https://github.com/thomseddon/traefik-forward-auth).

The illustration shows the docker containers and the authorisation
setup.

![traefik OAuth 2.0](./traefik-oauth.png)

The **traefik forward-auth** can use any OAuth 2.0 provider. The DTaaS
uses GitLab as the authorisation provider, with the OAuth 2.0 web /
server application authorisation flow.

The configuration steps are:

**1. Choose GitLab Server:**

- OAuth 2.0 authorisation must be set up on a GitLab server.
  An on-premises GitLab installation is preferable to the commercial
  <https://gitlab.com>.
- The
  [GitLab Omnibus Docker](https://docs.gitlab.com/ee/install/docker.html)
  can be used for this purpose.
- The OAuth 2.0 application should be configured as an
  [instance-wide authorization type](https://docs.gitlab.com/ee/integration/oauth_provider.html#create-an-instance-wide-application).
  Select the options to generate a client secret and to make it a
  trusted application.

**2. Determine Website Hostname:**

Decide the hostname of the website before setting up OAuth 2.0 on
GitLab. A self-hosted GitLab instance is recommended, because other
parts of the DTaaS platform can use it too.

**3. Determine Callback and Logout URLs:**

For the web / server authorisation flow to function correctly,
two URLs are required: a _callback URL_ and a _logout URL_.

- The callback URL tells the OAuth 2.0 provider where to redirect
  signed-in users. It is the landing homepage of the DTaaS platform
  (either <http://intocps.org/_oauth/> or <http://localhost/_oauth/>).
- The logout URL signs users out of GitLab and clears their
  authorisation in traefik forward-auth
  (either <http://intocps.org/_oauth/logout> or <http://localhost/_oauth/logout>).
  Do not enter the logout URL in the GitLab OAuth 2.0 application setup.

**4. Create OAuth 2.0 Application:**

The OAuth 2.0 application setup on GitLab is at Edit **Profile** ->
**Application** <https://gitlab.intocps.org/-/profile/applications>.

When creating the OAuth 2.0 application on GitLab, select the
**_read_user_** scope.

![Creation of Server OAuth 2.0 Application](server-oauth.png)

**5. Copy Application Credentials:**

After creating the OAuth 2.0 application, GitLab generates an
_application ID_ and a _client secret_. Both are long hexadecimal
strings needed in the configuration files.

![Server OAuth Application Credentials](server-oauth2.png)

**6. Checklist: Required Information from OAuth 2.0 Application:**

The following information is needed from the OAuth 2.0 application
registered on GitLab:

<!-- markdownlint-disable MD013 -->
<!-- markdownlint-disable MD060 -->
| GitLab Variable Name | Variable Name in .env of docker compose file               | Default Value                                                                               |
| :------------------- | :--------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| OAuth 2.0 Provider   | OAUTH_URL                                                  | [https://gitlab.intocps.org/](https://gitlab.intocps.org/)                                  |
| Application ID       | OAUTH_CLIENT_ID                                            | _xx_                                                                                        |
| Application Secret   | OAUTH_CLIENT_SECRET                                        | _xx_                                                                                        |
| Callback URL         | (to be directly entered in GitLab OAuth  2.0 registration) |                                                                                             |
| Forward-auth secret  | OAUTH_SECRET                                               | _random-secret-string_ (password for forward-auth, can be changed to a preferred string)    |
| Scopes               | read_user                                                  |                                                                                             |
<!-- markdownlint-enable MD013 -->
<!-- markdownlint-enable MD060 -->

## Development Environment

The developer Docker environment in `developer/check/` and the server
installation scenarios require traefik forward-auth.

## Configure Authorisation Rules for Traefik Forward-Auth

The Traefik forward-auth microservice needs rules that manage
authorisation for different URL paths. The rules go in the
_conf.server_ file. There are broadly three kinds of URLs:

### Public Path Without Authorisation

An example of a public page:

```text
rule.noauth.action=allow
rule.noauth.rule=Path(`/public`)
```

Here, 'noauth' is the rule name. Change it to suit the rule; each rule
needs a unique name. The 'action' property is set to "allow" to make
the resource public. The 'rule' property defines the path or route to
the resource.

### Common to All Users

To set up a page that requires GitLab OAuth 2.0 but is available to
all users of the GitLab instance:

```text
rule.all.action=auth
rule.all.rule=Path(`/common`)
```

The 'action' property is set to "auth", so users must sign in with
GitLab OAuth 2.0 before they can access the resource.

### Selective Access

Selective access allows only a few users to reach a URL path. To set
up selective access to a page:

```text
rule.onlyu1.action=auth
rule.onlyu1.rule=Path(`/user1`)
rule.onlyu1.whitelist = user1@localhost
```

The 'whitelist' property of a rule is a comma-separated list of the
email IDs allowed to access the resource. Users can still sign in with
either their username or email ID, but the email ID of their account
must be in the whitelist. Only the users in the whitelist can access
the resource.

## User management

Use the [DTaaS CLI](../cli.md) to add users to and remove users from
a DTaaS instance.

## Limitation

The **traefik-forward-auth** microservice does not reload the rules in
the _conf.*_ file. Restart **traefik-forward-auth** after any change to
the _conf_ file. The restart invalidates all existing user sessions.
