# Add a new user

This page will guide you on, how to add more users to the DTaas. Please do the following:


**1. Add user to Gitlab instance:**

Add a new account for the new user on the Gitlab instance.
Note the username and email of the added account

**2. Add user to DTaaS software using CLI**

Add a new user with the easy-to-use
[DTaaS CLI](../cli.md)

**3. Add backend authorization for these users:**

- Go to the _docker_ directory

```bash
cd <DTaaS>/docker
```

- Add three lines to the `conf.server` file

```txt
rule.onlyu3.action=auth
rule.onlyu3.rule=PathPrefix(`/user3`)
rule.onlyu3.whitelist = user3@emailservice.com
```

Run the command for these changes to take effect:

```bash
docker compose -f compose.server.yml --env-file .env up -d --force-recreate traefik-forward-auth
```

The new users are now added to the DTaaS
instance, with authorization enabled.

**4. Access the new user:**

Log into the DTaaS application as new user.
