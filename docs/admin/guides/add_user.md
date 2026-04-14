# Add User

This page provides steps for adding a user to a DTaaS installation.
The username **alice** is used here to illustrate the steps involved in
adding a user account.

The following steps should be performed:

**1. Add user to GitLab instance:**

A new account for the new user should be added on the GitLab instance.
The username and email of the new account should be noted.

**2. Create User Workspace:**

The [DTaaS CLI](../cli.md) should be used to bring up the workspaces for new users.
This brings up the containers without backend authorisation.

**3. Add backend authorisation for the user:**

- Navigate to the secure server package directory

  ```bash
  cd <DTaaS>/deploy/dtaas/docker/server
  ```

- Add three lines to `config/conf.server`

  ```txt
  rule.onlyu3.action=auth
  rule.onlyu3.rule=PathPrefix(`/alice`)
  rule.onlyu3.whitelist = alice@intocps.org
  ```

**4. Restart the docker container responsible for backend authorisation:**

```bash
docker compose --env-file config/.env up \
  -d --force-recreate traefik-forward-auth
```

**5. The new users are now added to the DTaaS instance with authorisation enabled.**
