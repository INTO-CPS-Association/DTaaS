# Make common asset area read only

## Why

In some cases you might want to restrict the access rights of some users
to the common assets.
In order to make the common area read only,
you have to change the install script section performing the creation
of user workspaces.

## How

To make the common assets read-only for user2,
the following changes need to be made to the install script,
which is located one of the following places.

- trial installation: `single-script-install.sh`

- production installation: `DTaas/deploy/install.sh`

The line `-v "${TOP_DIR}/files/common:/workspace/common:ro"`
was added to make the common workspace read-only for user2.

Here's the updated code:

```sh
docker run -d \
  -p 8091:8080 \
  --name "ml-workspace-user2" \
  -v "${TOP_DIR}/files/user2:/workspace" \
  -v "${TOP_DIR}/files/common:/workspace/common:ro" \
  --env AUTHENTICATE_VIA_JUPYTER="" \
  --env WORKSPACE_BASE_URL="user2" \
  --shm-size 512m \
  --restart always \
  mltooling/ml-workspace-minimal:0.13.2 || true
```

This ensures that the common area is read-only for user2,
while the user's own (private) assets are still writable.
