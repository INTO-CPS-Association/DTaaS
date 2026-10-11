#!/bin/sh
# Entrypoint for the logger Docker image.
#
# Docker creates a missing bind-mounted directory owned by root, and the
# logger, which runs as the unprivileged node user, cannot write to it.
# When started as root, give node the log and certs directories if it
# cannot already write there, then run the logger as node. Only the
# directories change owner, so certificates the host provides keep
# theirs.
set -eu

log_dir=$(dirname "${LOGGER_LOG_FILE_PATH:-logs/workflow-logs.jsonl}")
certs_dir="${LOGGER_CERTS_DIR:-certs}"

if [ "$(id -u)" -ne 0 ]; then
  exec "$@"
fi

for dir in "$log_dir" "$certs_dir"; do
  mkdir -p "$dir"
  if ! setpriv --reuid=node --regid=node --init-groups test -w "$dir"; then
    chown node:node "$dir"
  fi
done
# setpriv keeps the environment; yarn would otherwise read root's HOME.
export HOME=/home/node
exec setpriv --reuid=node --regid=node --init-groups "$@"
