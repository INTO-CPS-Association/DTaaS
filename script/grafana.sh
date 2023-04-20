#!/bin/bash
printf "Grafana provisioning script\n"
# Command to launch grafana

docker run -d \
 -p 3000:3000 \
 --name=grafana-test \
 -e "GF_SERVER_SERVE_FROM_SUB_PATH=true" \
 -e "GF_SERVER_DOMAIN=localhost" \
 -e "GF_SERVER_ROOT_URL=%(protocol)s://%(domain)s:%(http_port)s/vis" \
 -e "GF_AUTH_BASIC_ENABLED=false" \
 -e "GF_AUTH_PROXY_ENABLED=false" \
 -e "GF_SECURITY_ALLOW_EMBEDDING=true" \
 -e "GF_AUTH_ANONYMOUS_ENABLED=true" \
 -e "GF_AUTH_ANONYMOUS_ORG_NAME=Main" \
 -e "GF_AUTH_ANONYMOUS_ORG_ROLE=Editor" \
 -e "GF_USERS_ALLOW_SIGN_UP=false" \
 -e "GF_FEATURE_TOGGLES_ENABLE=publicDashboards" \
 -e "GF_PATHS_CONFIG=/etc/grafana/grafana.ini"  \
 -e "GF_PATHS_DATA=/var/lib/grafana" \
 -e "GF_PATHS_HOME=/usr/share/grafana" \
 -e "GF_PATHS_LOGS=/var/log/grafana" \
 -e "GF_PATHS_PLUGINS=/var/lib/grafana/plugins" \
 -e "GF_PATHS_PROVISIONING=/etc/grafana/provisioning" \
 -e "HOME=/home/grafana" \
 grafana/grafana
printf "Complete the setup from GUI"

