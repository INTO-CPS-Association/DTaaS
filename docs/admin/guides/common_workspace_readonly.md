# Make Common Assets Read Only

## Why

Some installations need to stop users from changing the common assets.
To make the common area read only, change the volume definitions of the
user workspace services.

!!! note
    Make these changes before installing the application.

## How

To make the common assets read only, change the user services in
the secure-server `docker-compose.yml` file as follows.

```docker
  ...
  user1:
    ....
    volumes:
      - ./files/common:/workspace/common:ro
    ....

  user2:
    ....
    volumes:
      - ./files/common:/workspace/common:ro
    ....

```

The `:ro` suffix at the end of the line makes the common assets read
only.

To apply the same restriction to new users, make the same change to any
additional `userX` service blocks in
`deploy/dtaas/docker/secure-server/docker-compose.yml`. Users added with
the [DTaaS CLI](../cli.md) get their volumes from the
`users.server.yml` and `users.server.secure.yml` templates in the
installation directory, so add `:ro` to the `/workspace/common` volume
there as well.
