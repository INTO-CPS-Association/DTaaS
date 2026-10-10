# Remove User

This page removes a user from a DTaaS installation, using the username
**alice** as the example.

**1. Remove the user with the [DTaaS CLI](../cli.md):**

Run the CLI from the installation directory, which holds `dtaas.toml`
and `config/conf.server`:

```bash
dtaas user delete alice
```

The CLI stops and removes the workspace container and deletes the
user's forward-auth rule from `config/conf.server`. A rule that was
added by hand has the following form; remove it yourself if the CLI
left it in place:

```txt
rule.onlyu3.action=auth
rule.onlyu3.rule=PathPrefix(`/alice`)
rule.onlyu3.whitelist = alice@intocps.org
```

**2. Restart the container responsible for backend authorisation:**

```bash
docker compose --env-file config/.env up \
  -d --force-recreate traefik-forward-auth
```

The removed user no longer has backend authorisation.

**3. Remove the user from the GitLab instance (optional):**

The
[GitLab docs](https://docs.gitlab.com/ee/user/profile/account/delete_account.html)
describe how to delete an account.

## Caveat

The CLI can delete only users that were added with `dtaas user add`.
The starting users listed in `dtaas.toml` at installation time cannot
be deleted this way.
