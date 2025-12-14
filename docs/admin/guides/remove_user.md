# Remove User

This page provides steps for removing a user from a DTaaS installation.
The username **alice** is used here to illustrate the steps involved in
removing a user account.

The following steps should be performed:

**1. Remove an existing user with the [DTaaS CLI](../cli.md).**

**2. Remove backend authorization for the user:**

- Navigate to the _docker_ directory

  ```bash
  cd <DTaaS>/docker
  ```

- Remove these three lines from the `conf.server` file

  ```txt
  rule.onlyu3.action=auth
  rule.onlyu3.rule=PathPrefix(`/alice`)
  rule.onlyu3.whitelist = alice@foo.com
  ```

- Run the command for these changes to take effect:

  ```bash
  docker compose -f compose.server.yml --env-file .env up \
    -d --force-recreate traefik-forward-auth
  ```

The extra users now have no backend authorization.

**3. Remove users from GitLab instance (optional):**

The
[GitLab docs](https://docs.gitlab.com/ee/user/profile/account/delete_account.html)
provide additional guidance.

**4. The user account is now deleted.**

## Caveat

The two base users that the DTaaS platform
was installed with cannot be deleted. Only the extra users that
have been added to the software can be deleted.
