#!/bin/bash
# Smoke test for the logger Docker image.
#
# Usage: test/docker/check-image.sh <image> [<host-log-dir>]
#
# Bind-mounts a log directory that does not exist yet, so Docker creates
# it owned by root, as it does in the deployment compose files. The
# logger must still accept an event (HTTP 204) and write it as the node
# user, not as root.
set -euo pipefail

image="$1"
log_dir="${2:-$(mktemp -d)/logs}"
port=4003
event='{"sessionId":"4a4f6d5f-818d-4c86-b5dc-0d4f8a38dc02",
"userHash":"a3f2b8c1d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678",
"timestamp":"2026-03-24T20:00:00.000Z","event":"click","page":"/library",
"element":"tab","label":"Functions","context":{}}'

fail() {
  echo "error: $*" >&2
  exit 1
}

wait_for_health() {
  local attempt
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl --fail --silent "http://127.0.0.1:$port/logger/health" \
      > /dev/null; then
      return 0
    fi
    echo "waiting for logger health (attempt $attempt)"
    sleep 3
  done
  fail "logger did not become healthy"
}

# Prints only the HTTP status code; the response body is dropped by tail.
post_event() {
  curl --silent --write-out '\n%{http_code}' \
    --header 'content-type: application/json' --data "$event" \
    "http://127.0.0.1:$port/logger" | tail -n 1
}

container_id=$(docker run --detach --rm \
  --publish "127.0.0.1:$port:$port" \
  --volume "$log_dir:/dtaas/logger/logs" \
  "$image")
trap 'docker logs "$container_id"; docker stop "$container_id" > /dev/null' EXIT

wait_for_health
status=$(post_event)
[ "$status" = "204" ] || fail "POST /logger returned HTTP $status, want 204"
owner=$(docker exec "$container_id" \
  stat -c %U /dtaas/logger/logs/workflow-logs.jsonl)
[ "$owner" = "node" ] || fail "log file owned by '$owner', want 'node'"
echo "logger image accepted an event and wrote it as node"
