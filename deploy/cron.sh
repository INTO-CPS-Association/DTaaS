#!/bin/bash
# Run the client website and lib microservice in background mode

PROJECT_PATH="$1"

nc -z localhost 4000
PORT_STATUS=$?
if (( PORT_STATUS == 1 ))
then
  echo "starting react website"
  cd "${PROJECT_PATH}/client" || exit
  nohup serve -s build -l 4000 & disown
fi



nc -z localhost 4001
PORT_STATUS=$?
if (( PORT_STATUS == 1 ))
then
  nohup libms -c "${PROJECT_PATH}/deploy/config/lib" & disown
fi

docker start traefik-gateway