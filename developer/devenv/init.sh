#!/bin/sh
# Prepare the host checkout before the devenv container first starts.
# The devcontainer runs this as its initializeCommand; plain Docker users
# run it once by hand. It is safe to run again.
set -eu

devenv_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "${devenv_dir}/../.." && pwd)"

# The image bakes in the host identity so bind-mounted files keep their
# owner. An existing .env is left alone to preserve port overrides.
if [ ! -f "${devenv_dir}/.env" ]; then
  printf 'UID=%s\nGID=%s\n' "$(id -u)" "$(id -g)" >"${devenv_dir}/.env"
fi

# Named volumes are mounted over these paths inside the bind mount. If a
# path is missing, a rootful daemon creates it on the host as root, and a
# later host-side 'yarn install' fails.
for project in client servers/lib servers/logger lib/dt-automation; do
  mkdir -p "${repo_dir}/${project}/node_modules"
done
