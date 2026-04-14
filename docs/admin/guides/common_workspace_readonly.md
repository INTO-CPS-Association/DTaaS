# Make Common Assets Read Only

## Why

In some cases it may be necessary to restrict the access rights of some users
to the common assets.
In order to make the common area read only,
the install script section performing the creation
of user workspaces must be changed.

!!! note
    These step needs to be performed before installation of the application.

## How

To make the common assets read-only for a user,
the following changes need to be made to
the secure-server `docker-compose.yml` file.

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

Note the `:ro` at the end of the line. This suffix makes
the common assets read only.

To apply the same kind of read only restriction for
new users as well, make a similar change to any additional `userX`
service blocks added in `deploy/dtaas/docker/secure-server/docker-compose.yml`.
