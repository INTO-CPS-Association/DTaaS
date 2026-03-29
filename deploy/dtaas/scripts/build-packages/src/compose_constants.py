"""Shared constants for compose rendering."""

RESTART_UNLESS_STOPPED = "  restart: unless-stopped"
SERVICE_VOLUMES = "  volumes:"
SERVICE_LABELS = "  labels:"
SERVICE_NETWORKS = "  networks:"
NETWORK_FRONTEND = "    - frontend"
NETWORK_USERS = "    - users"
TRAEFIK_ENABLE_LABEL = "traefik.enable=true"
