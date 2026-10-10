# Add User

This page adds a user to a DTaaS installation, using the username
**alice** as the example.

**1. Add the user to the GitLab instance:**

Create an account for the new user on the GitLab instance and note its
username and email. If GitLab provisioning (`[gitlab].provision` in
`dtaas.toml`) is enabled, the DTaaS CLI creates the account in the next
step instead.

**2. Create the user workspace:**

Run the [DTaaS CLI](../cli.md) from the installation directory, which
holds `dtaas.toml` and `config/conf.server`:

```bash
dtaas user add alice --email alice@intocps.org
```

The CLI creates the workspace files, starts the workspace container and,
because `--email` is given, appends the forward-auth rule for the user to
`config/conf.server`.

**3. Add backend authorisation by hand (only without `--email`):**

Without `--email`, the CLI writes no forward-auth rule. In that case, add
three lines to `config/conf.server`:

```txt
rule.onlyu3.action=auth
rule.onlyu3.rule=PathPrefix(`/alice`)
rule.onlyu3.whitelist = alice@intocps.org
```

**4. Restart the container responsible for backend authorisation:**

```bash
docker compose --env-file config/.env up \
  -d --force-recreate traefik-forward-auth
```

The new user is now part of the DTaaS instance, with authorisation
enabled.
