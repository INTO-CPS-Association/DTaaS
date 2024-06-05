# Add User

This page provides steps to adding a user from a DTaaS installation.
The username **alice** is used here to illustrate the steps involved in
removing a user account.

Please do the following:

**1. Add user to Gitlab instance:**

Add a new account for the new user on the Gitlab instance.
Note the username and email of the new account.

**2. Create User Workspace:**

Use the [DTaaS CLI](../cli.md) to bring up the workspaces for new users.
This brings up the containers, without the backend authorization.

**3. Add backend authorization for the user:**

- Go to the _docker_ directory

  ```bash
  cd <DTaaS>/docker
  ```

- Add three lines to the `conf.server` file

  ```txt
  rule.onlyu3.action=auth
  rule.onlyu3.rule=PathPrefix(`/alice`)
  rule.onlyu3.whitelist = alice@foo.com
  ```

**4. Restart the docker container responsible for backend authorization.**

```bash
docker compose -f compose.server.yml --env-file .env up -d --force-recreate traefik-forward-auth
```

**5. The new users are now added to the DTaaS instance, with authorization enabled.**
