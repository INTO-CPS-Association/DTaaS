#!/usr/bin/env bash
# Create per-service TLS cert files in certs/, the same way
# `dtaas-services host setup` (dtaas-services 1.2.0) does.
#
# Usage: sudo ./setup-certs.sh [project-dir]
#   project-dir: the dtaas-services project dir (default: current directory)
#
# Input:  <project-dir>/certs/fullchain.pem and <project-dir>/certs/privkey.pem
#         (or certbot-style fullchainN.pem / privkeyN.pem; the highest N is used)
# UIDs/GIDs are read from <project-dir>/config/services.env.
# Safe to re-run. Run it after `dtaas-services service clean`, which deletes
# data/thingsboard and log/thingsboard.
set -euo pipefail

PROJECT_DIR="${1:-${PROJECT_DIR:-$PWD}}"
cd "${PROJECT_DIR}" || { echo "ERROR: cannot cd to ${PROJECT_DIR}" >&2; exit 1; }
PROJECT_DIR=$(pwd)

ENV_FILE=config/services.env
CERTS=certs

die() { echo "ERROR: $*" >&2; exit 1; }

[[ ${EUID} -eq 0 ]] || die "run as root: sudo $0 [project-dir]"
[[ -f ${ENV_FILE} ]] || die "${ENV_FILE} not found in ${PROJECT_DIR} (pass the project dir as argument)"

# Normalize certbot-style names (fullchain2.pem -> fullchain.pem), like `host setup` does.
normalize() {
  local prefix=$1 latest
  [[ -f ${CERTS}/${prefix}.pem ]] && return 0
  latest=$(find "${CERTS}" -maxdepth 1 -regextype posix-extended -regex ".*/${prefix}[0-9]+\.pem" \
    | sort -V | tail -1)
  [[ -n ${latest} ]] || die "${CERTS}/${prefix}.pem not found"
  echo "Renaming ${latest} -> ${CERTS}/${prefix}.pem"
  mv "${latest}" "${CERTS}/${prefix}.pem"
}
normalize fullchain
normalize privkey

# Read one numeric key from services.env without sourcing the file (it holds passwords).
env_id() {
  local v
  v=$(grep -E "^$1=" "${ENV_FILE}" | tail -1 | cut -d= -f2- | tr -d "\"' ")
  [[ ${v} =~ ^[0-9]+$ ]] || die "$1 is missing or not numeric in ${ENV_FILE}"
  echo "${v}"
}

USERID=$(env_id USERID)
GROUPID=$(env_id GROUPID)
POSTGRES_UID=$(env_id POSTGRES_UID)
POSTGRES_GID=$(env_id POSTGRES_GID)
THINGSBOARD_UID=$(env_id THINGSBOARD_UID)
THINGSBOARD_GID=$(env_id THINGSBOARD_GID)
RABBIT_UID=$(env_id RABBIT_UID)
MONGO_UID=$(env_id MONGO_UID)
MONGO_GID=$(env_id MONGO_GID)
INFLUX_UID=$(env_id INFLUX_UID)
INFLUX_GID=$(env_id INFLUX_GID)

# The key must belong to the certificate.
cert_pub=$(openssl x509 -in "${CERTS}/fullchain.pem" -noout -pubkey | sha256sum)
key_pub=$(openssl pkey -in "${CERTS}/privkey.pem" -pubout | sha256sum)
[[ ${cert_pub} == "${key_pub}" ]] || die "privkey.pem does not match fullchain.pem"
openssl x509 -in "${CERTS}/fullchain.pem" -noout -subject -enddate

FULLCHAIN=${CERTS}/fullchain.pem
PRIVKEY=${CERTS}/privkey.pem

echo "PostgreSQL (${POSTGRES_UID}:${POSTGRES_GID})"
install -o "${POSTGRES_UID}" -g "${POSTGRES_GID}" -m 644 "${FULLCHAIN}" "${CERTS}/postgres.crt"
install -o "${POSTGRES_UID}" -g "${POSTGRES_GID}" -m 600 "${PRIVKEY}" "${CERTS}/postgres.key"

echo "ThingsBoard HTTPS + MQTTS (${THINGSBOARD_UID}:${THINGSBOARD_GID})"
install -o "${THINGSBOARD_UID}" -g "${THINGSBOARD_GID}" -m 644 "${FULLCHAIN}" "${CERTS}/thingsboard-fullchain.pem"
install -o "${THINGSBOARD_UID}" -g "${THINGSBOARD_GID}" -m 600 "${PRIVKEY}" "${CERTS}/thingsboard-privkey.pem"
mkdir -p data/thingsboard log/thingsboard
chmod 777 data/thingsboard log/thingsboard
chown -R "${THINGSBOARD_UID}:${THINGSBOARD_GID}" data/thingsboard log/thingsboard

echo "RabbitMQ AMQPS + management + MQTT (${RABBIT_UID})"
install -o "${RABBIT_UID}" -m 600 "${PRIVKEY}" "${CERTS}/privkey-rabbitmq.pem"

echo "MongoDB combined.pem (${MONGO_UID}:${MONGO_GID})"
tmp=$(mktemp "${CERTS}/combined.pem.XXXXXX")
cat "${PRIVKEY}" "${FULLCHAIN}" > "${tmp}"
chown "${MONGO_UID}:${MONGO_GID}" "${tmp}"
chmod 600 "${tmp}"
mv -f "${tmp}" "${CERTS}/combined.pem"

echo "InfluxDB (${INFLUX_UID}:${INFLUX_GID})"
install -o "${INFLUX_UID}" -g "${INFLUX_GID}" -m 600 "${PRIVKEY}" "${CERTS}/privkey-influxdb.pem"

# Grafana (runs as USERID:GROUPID) and GitLab (root) use fullchain.pem/privkey.pem directly.
echo "Grafana + GitLab source certs (${USERID}:${GROUPID})"
chown "${USERID}:${GROUPID}" "${FULLCHAIN}" "${PRIVKEY}"
chmod 644 "${FULLCHAIN}"
chmod 600 "${PRIVKEY}"

echo
ls -ln "${CERTS}"
echo "Done."
