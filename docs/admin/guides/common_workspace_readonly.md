# Make common asset area read only

## Why
In some cases you might want to restrict the users rights to the common workspace. In order to make the common area read only, you have to change the script for setting up the user workspace. 

## How
To make the common area read-only for user2, the following changes were made to the script for setting up the user workspace:

The line `-v "${TOP_DIR}/files/common:/workspace/common:ro"` was added to make the common workspace read-only for user2.

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
  mltooling/ml-workspace:0.13.2 || true
```
This ensures that the common area is read-only for user2, while the user's own files are still writable.

