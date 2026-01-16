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
This brings up the containers without backend authorization.

**3. Add backend authorization for the user:**

- Navigate to the _docker_ directory

  ```bash
  cd <DTaaS>/docker
  ```

- Add three lines to the `conf.server` file

  ```txt
  rule.onlyu3.action=auth
  rule.onlyu3.rule=PathPrefix(`/alice`)
  rule.onlyu3.whitelist = alice@foo.com
  ```

**4. Restart the docker container responsible for backend authorization:**

```bash
docker compose -f compose.server.yml --env-file .env up \
  -d --force-recreate traefik-forward-auth
```

**5. The new users are now added to the DTaaS instance with authorization enabled.**
