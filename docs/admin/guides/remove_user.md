# Remove a new user

This page will guide you on, how to remove extra users to the DTaaS. Please do the following:

**1. Remove backend authorization for these users:**

- Go to the _docker_ directory

```bash
cd <DTaaS>/docker
```

- Remove these three lines from the `conf.server` file

```txt
rule.onlyu3.action=auth
rule.onlyu3.rule=PathPrefix(`/user3`)
rule.onlyu3.whitelist = user3@emailservice.com
```

Run the command for these changes to take effect:

```bash
docker compose -f compose.server.yml --env-file .env up -d --force-recreate traefik-forward-auth
```

The extra users now have no backend authorization.

**2. Remove users from DTaaS software using CLI**

Remove a new user with the easy-to-use
[DTaaS CLI](../cli.md)

**1. Remove users to Gitlab instance:**

Cleanup the deleted users account from your Gitlab instance.

**4. New user now deleted!**

The new user is now deleted completely from the DTaaS instance

## Caveat

You cannot delete the two base users that the DTaaS software
is installed with. You can only delete the extra users that
have been added to the software.