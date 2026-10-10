#!/bin/sh
# Entrypoint for the logger Docker image.
#
# Docker creates a missing bind-mounted log directory owned by root, and
# the logger, which runs as the unprivileged node user, cannot write to
# it. When started as root, give node the log directory if it cannot
# already write there, then run the logger as node.
set -eu

log_dir=$(dirname "${LOGGER_LOG_FILE_PATH:-logs/workflow-logs.jsonl}")

if [ "$(id -u)" -ne 0 ]; then
  exec "$@"
fi

mkdir -p "$log_dir"
if ! setpriv --reuid=node --regid=node --init-groups test -w "$log_dir"; then
  chown node:node "$log_dir"
fi
# setpriv keeps the environment; yarn would otherwise read root's HOME.
export HOME=/home/node
exec setpriv --reuid=node --regid=node --init-groups "$@"
