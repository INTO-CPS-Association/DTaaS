# Identity Providers: Claims, Roles and Access Mapping

This page is the first step of phase 2 of the [signals gateway
plan](signals-gateway.md). It states what each identity provider of DTaaS
gives about a user, how the access table of the [access plan](access-plan.md)
maps onto each
provider and each service. It also says how Traefik connects the providers to
the services. The sign-in code of the gateway follows this page.

## What Each Provider Gives

| | GitLab | Keycloak | Dex |
| :-- | :----- | :------- | :-- |
| How the gateway checks it | `oauth/token/info` and `api/v4/user` on GitLab | Signature from the realm JWKS, `iss`, `exp` and `aud` | Signature from the Dex JWKS, `iss`, `exp` and `aud` |
| User id | `sub` | `sub` | `sub` |
| Email and user name | `email`, `preferred_username` | `email`, `preferred_username` | `email`, `preferred_username` with the `profile` scope |
| Groups | `groups_direct` in the ID token. `groups` from userinfo | Groups through a group membership mapper | `groups` with the `groups` scope |
| Roles | `owner`, `maintainer` and `developer` claims from userinfo, for direct membership only. No claim for Reporter | Realm and client roles in `realm_access` and `resource_access` | No role claim. The GitLab connector can add the role to each group as `group:role`, from the same userinfo claims as GitLab |
| Audience | The token info names the OAuth application | An audience mapper adds the gateway to `aud` | `aud` is the client id the token was issued to |

Sources: [GitLab OpenID Connect
provider](https://docs.gitlab.com/integration/openid_connect_provider/),
[GitLab token info](https://docs.gitlab.com/api/oauth2/), [Keycloak server
administration](https://www.keycloak.org/docs/latest/server_admin/), [Dex
GitLab connector](https://dexidp.io/docs/connectors/gitlab/) and [Dex
scopes](https://dexidp.io/docs/configuration/custom-scopes-claims-clients/).

Two consequences for the gateway follow from the table:

- A viewer level read from GitLab claims is not possible, since there is no
  claim for Reporter. The gateway asks the GitLab API with the user's token, as
  #1879 does, or the level comes from a group name in Keycloak or Dex.
- A Keycloak or Dex token cannot be sent to GitLab. With those providers the
  gateway reads the projects a user may read from the groups in the token, and
  the group of a twin from its GitLab namespace.

## Access Table per Provider

The access table of the access plan has three levels per group,
`<group>_viewer`, `<group>_member` and `<group>_admin`. It says what each level
may do in each component. Each provider carries the levels as follows.

| Level | GitLab | Keycloak | Dex with the GitLab connector |
| :---- | :----- | :------- | :---------------------------- |
| `<group>_admin` | Maintainer of the group, from the API or the `maintainer` claim | Group or client role `<group>_admin` | `<group>:maintainer` |
| `<group>_member` | Developer, from the API or the `developer` claim | Group or client role `<group>_member` | `<group>:developer` |
| `<group>_viewer` | Reporter, from the API only | Group or client role `<group>_viewer` | Not available, since the connector has no Reporter claim to read |

For the signals gateway, `<group>_viewer` reads the signals of the group's
twins and `<group>_member` and `<group>_admin` also send data to them.

## Traefik Glue

Traefik Proxy has the ForwardAuth middleware and no built-in OIDC middleware.
OIDC is a Traefik Hub feature. ForwardAuth sends each request to a sign-in
proxy, which answers 2xx to let it through and sets user headers.

| Option | State | Fit |
| :----- | :---- | :-- |
| `thomseddon/traefik-forward-auth` | Used by DTaaS today. Last release in May 2024 | Works with GitLab. No group or role headers |
| oauth2-proxy | Maintained. Providers for GitLab, Keycloak and generic OIDC | Can pass the user's groups to the service in a header. The version to pin is v7.15.5, the newest one older than ten days |

The gateway does not depend on the proxy: it checks the bearer token itself
on every request. The proxy protects the pages and the services without their
own sign-in, such as Grafana behind auth proxy.

## Checks of the Gateway per Provider

- **GitLab:** the token info names the DTaaS client as the application, the
  token has not expired and the user of the token info is the user of
  `api/v4/user`. This is the code of #1879, kept as it is.
- **Keycloak and Dex:** the signature verifies against the provider's JWKS,
  `iss` is the configured issuer, `exp` has not passed and `aud` names the
  gateway (RFC 9068). Only RS256 and ES256 are accepted, never `none` or HMAC
  (RFC 8725). The groups of the token name the projects. The twins of those
  projects are read with the gateway's own GitLab token, kept in
  `gitlab-token-file`, since a Keycloak or Dex token cannot be sent to GitLab.
- **Group names:** each provider is configured with one format of group name,
  `access-plan` for Keycloak or `dex-gitlab` for Dex. Owner names are
  checked against the characters GitLab allows. A GitLab group a user creates
  with a name such as `alice_admin` therefore grants nothing through Dex.
- **All providers:** a token issued to another application or audience, an
  expired token and an undeclared path are refused. Each decision is logged
  with the user, the action, the path and the result, never the token.

## Standards

The design is checked against [RFC
9700](https://datatracker.ietf.org/doc/html/rfc9700) (OAuth 2.0 security best
current practice), [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068)
(JWT access tokens), [RFC 8725](https://datatracker.ietf.org/doc/html/rfc8725)
(JWT best current practices), [RFC
10017](https://datatracker.ietf.org/doc/html/rfc10017) (OAuth for browser-based
applications), [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/)
and [NIST SP 800-162](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
(attribute-based access control).

Until the website backend of step 8 of the access plan holds the tokens, the
browser holds them. RFC 10017 recommends a backend for applications that
handle personal or business data, so this stays a known gap until step 8.

## Open Questions

1. Does a Keycloak deployment carry the levels as groups or as client roles?
2. Which providers does the first deployment use: GitLab only, or Keycloak or
   Dex in front of GitLab?
3. The GitLab connector of Dex reports membership of GitLab groups, not of
   projects. Each user's twins live in the project `DTaaS/<owner>`, so a Dex
   sign-in grants a project only if `DTaaS/<owner>` is also a group. GitLab
   does not allow a group and a project with the same path. Does each owner
   become a subgroup, or does Dex stay without project access?
