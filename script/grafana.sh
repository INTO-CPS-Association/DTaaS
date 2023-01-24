#!/bin/bash
echo -e "Grafana provisioning script"
# Command to launch grafana
```bash
docker run -d \
 -p 3000:3000 \
 --name=grafana-test \
 -e "GF_SERVER_SERVE_FROM_SUB_PATH=true" \
 -e "GF_SERVER_DOMAIN=localhost" \
 -e "GF_SERVER_ROOT_URL=%(protocol)s://%(domain)s:%(http_port)s/vis" \
 -e "GF_PATHS_CONFIG=/etc/grafana/grafana.ini"  \
 -e "GF_PATHS_DATA=/var/lib/grafana" \
 -e "GF_PATHS_HOME=/usr/share/grafana" \
 -e "GF_PATHS_LOGS=/var/log/grafana" \
 -e "GF_PATHS_PLUGINS=/var/lib/grafana/plugins" \
 -e "GF_PATHS_PROVISIONING=/etc/grafana/provisioning" \
 -e "HOME=/home/grafana" \
  grafana/grafana
```
