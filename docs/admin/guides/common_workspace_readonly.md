# Make Common Asset Read Only

## Why

In some cases you might want to restrict the access rights of some users
to the common assets.
In order to make the common area read only,
you have to change the install script section performing the creation
of user workspaces.

!!! note
    These step needs to be performed before installation of the application.

## How

To make the common assets read-only for a user,
the following changes need to be made to
the `compose.server.yml` file.

```docker
  ...
  user1:
    ....
    volumes:
      - ${DTAAS_DIR}/files/common:/workspace/common:ro
    ....

  user2:
    ....
    volumes:
      - ${DTAAS_DIR}/files/common:/workspace/common:ro
    ....

```

Please note the `:ro` at the end of the line. This suffix makes
the common assets read only.

If you want to have the same kind of read only restriction for
new users as well, please make a similar change in `cli/users.server.yml`.
