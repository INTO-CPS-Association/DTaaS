#!/bin/bash
set -eu

printf "NOTE\n "
printf "....\n "
printf "This script installs DTaaS application for two users.\n "
printf "Remember to configure the application before proceeding further....\n "
printf "All the configuration instructions are in deploy/README.md file.\n "
printf ".........\n \n \n "

printf "Press Ctl+C if you need to complete the configuration....\n "
printf "Waiting for 60 seconds....\n "
sleep 60

printf "\n \n Install the system dependencies...\n "
printf "....\n "
bash script/base.sh || exit

printf "\n \n Download the required docker images...\n "
printf ".........\n "
docker pull traefik:v2.10
docker pull mltooling/ml-workspace-minimal
printf "\n\n docker images successfully downloaded...\n \n \n "


printf "\n \n Continue with the DTaaS installation...\n "
printf ".........\n "
TOP_DIR=$(pwd)

printf "\n \n Build, configure and run the react website\n "
printf ".....\n "
cd "${TOP_DIR}/client" || exit
yarn install
yarn build

#one of the environments; specify only one; "dev" used the REACT_APP_ENV is not set
yarn configapp prod
cp "${TOP_DIR}/deploy/config/client/env.js" build/env.js
nohup serve -s build -l 4000 & disown

#-------------
printf "\n\nStart the lib microservice\n "
printf "...........\n "
cd "${TOP_DIR}/servers/lib" || exit
yarn install
yarn build
cp "${TOP_DIR}/deploy/config/lib" .env
nohup yarn start & disown

#-------------
printf "\n \n Start the user workspaces\n "
printf "...........\n "
docker run -d \
 -p 8090:8080 \
  --name "ml-workspace-user1" \
  -v "${TOP_DIR}/files/user1:/workspace" \
  -v "${TOP_DIR}/files/common:/workspace/common" \
  --env AUTHENTICATE_VIA_JUPYTER="" \
  --env WORKSPACE_BASE_URL="user1" \
  --shm-size 512m \
  --restart always \
  mltooling/ml-workspace-minimal || true

docker run -d \
 -p 8091:8080 \
  --name "ml-workspace-user2" \
  -v "${TOP_DIR}/files/user2:/workspace" \
  -v "${TOP_DIR}/files/common:/workspace/common" \
  --env AUTHENTICATE_VIA_JUPYTER="" \
  --env WORKSPACE_BASE_URL="user2" \
  --shm-size 512m \
  --restart always \
  mltooling/ml-workspace-minimal || true

#-------------
printf "\n \n Start the traefik gateway server\n "
printf "...........\n "
cd "${TOP_DIR}/servers/config/gateway" || exit
cp "${TOP_DIR}/deploy/config/gateway/auth" auth
cp "${TOP_DIR}/deploy/config/gateway/fileConfig.yml" "dynamic/fileConfig.yml"

sudo docker run -d \
 --name "traefik-gateway" \
 --network=host -v "$PWD/traefik.yml:/etc/traefik/traefik.yml" \
 -v "$PWD/auth:/etc/traefik/auth" \
 -v "$PWD/dynamic:/etc/traefik/dynamic" \
 -v /var/run/docker.sock:/var/run/docker.sock \
 traefik:v2.10 || true

#----------
printf "\n \n Create crontabs to run the application in daemon mode.\n "
printf "...........\n "
cd "$TOP_DIR" || exit
bash deploy/create-cronjob.sh

printf "\n \n The installation is complete.\n \n \n "
