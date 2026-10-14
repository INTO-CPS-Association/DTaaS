#!/bin/sh
# Entrypoint of the logger image. Docker creates a missing bind-mount
# directory as root, and the working directory belongs to root, so a
# container started as root hands the log and certs directories to the
# node user and then drops to that user before running the command. A
# container started as any other user runs the command unchanged.
set -eu

if [ "$(id -u)" -eq 0 ]; then
	log_dir=$(dirname "$LOGGER_LOG_FILE_PATH")
	mkdir -p "$log_dir" "$LOGGER_CERTS_DIR"
	# The log directory holds only the log file and its rotations, so the
	# files directly inside it are enough, and nothing deeper is walked as root.
	chown node:node "$log_dir"
	find "$log_dir" -maxdepth 1 -type f -exec chown node:node {} +
	# The certs directory may hold certificates the host provided, so only
	# the directory itself changes owner.
	chown node:node "$LOGGER_CERTS_DIR"
	export HOME=/home/node
	exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
