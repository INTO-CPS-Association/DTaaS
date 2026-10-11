#!/bin/bash
# Smoke test for the logger Docker image.
#
# Usage: test/docker/check-image.sh <image> [<host-dir>]
#
# Bind-mounts directories that do not exist yet, so Docker creates them
# owned by root, as it does in the deployment compose files. The logger
# must still accept an event (HTTP 204) and write it as the node user,
# and with LOGGER_TLS=true it must generate its certificate as node and
# serve HTTPS, with and without a mounted certs directory.
set -euo pipefail

image="$1"
host_dir="${2:-$(mktemp -d)}"
port=4003
container_id=""
event='{"sessionId":"4a4f6d5f-818d-4c86-b5dc-0d4f8a38dc02",
"userHash":"a3f2b8c1d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678",
"timestamp":"2026-03-24T20:00:00.000Z","event":"click","page":"/library",
"element":"tab","label":"Functions","context":{}}'

fail() {
  echo "error: $*" >&2
  exit 1
}

stop_container() {
  if [[ -n $container_id ]]; then
    docker logs "$container_id"
    docker stop "$container_id" >/dev/null
    container_id=""
  fi
}
trap stop_container EXIT

# Starts the image with the given extra docker run arguments.
start_container() {
  container_id=$(docker run --detach --rm \
    --publish "127.0.0.1:$port:$port" "$@" "$image")
}

# Waits until GET <base-url>/logger/health succeeds.
wait_for_health() {
  local base_url="$1" attempt
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl --fail --silent --insecure "$base_url/logger/health" \
      >/dev/null; then
      return 0
    fi
    echo "waiting for logger health at $base_url (attempt $attempt)"
    sleep 3
  done
  fail "logger did not become healthy at $base_url"
}

# Prints only the HTTP status code; the response body is dropped by tail.
post_event() {
  curl --silent --write-out '\n%{http_code}' \
    --header 'content-type: application/json' --data "$event" \
    "http://127.0.0.1:$port/logger" | tail -n 1
}

# Fails unless the given path in the container belongs to node.
require_node_owner() {
  local owner
  owner=$(docker exec "$container_id" stat -c %U "$1")
  [[ $owner == "node" ]] || fail "$1 owned by '$owner', want 'node'"
}

check_log_mount() {
  start_container --volume "$host_dir/logs:/dtaas/logger/logs"
  wait_for_health "http://127.0.0.1:$port"
  local status
  status=$(post_event)
  [[ $status == "204" ]] || fail "POST /logger returned HTTP $status, want 204"
  require_node_owner /dtaas/logger/logs/workflow-logs.jsonl
  stop_container
  echo "ok: accepted an event and wrote it as node"
}

# Starts with TLS on and the given extra docker run arguments.
check_tls() {
  start_container --env LOGGER_TLS=true "$@"
  wait_for_health "https://127.0.0.1:$port"
  require_node_owner /dtaas/logger/certs/privkey.pem
  stop_container
}

check_log_mount
check_tls
echo "ok: generated a certificate as node and served HTTPS"
check_tls --volume "$host_dir/certs:/dtaas/logger/certs"
echo "ok: same with a root-owned certs mount"
