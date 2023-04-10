#!/bin/bash

git clone https://github.com/INTO-CPS-Association/DTaaS.git DTaaS
cd DTaaS || exit
TOP_DIR=`pwd`
git fetch --all
git checkout feature/distributed-demo

#-------------
printf "\n\n start the react website"
cd "${TOP_DIR}/client" || exit
yarn install
yarn build

#one of the environments; specify only one; "dev" used the REACT_APP_ENV is not set
yarn configapp dev
nohup serve -s build -l 4000 & disown

#-------------
printf "\n\n start the jupyter notebook server"
docker run -d \
 -p 8090:8080 \
  --name "ml-workspace-user1" \
  -v "${TOP_DIR}/files/user1:/workspace" \
  -v "${TOP_DIR}/files/common:/workspace/common:ro" \
  --env AUTHENTICATE_VIA_JUPYTER="" \
  --env WORKSPACE_BASE_URL="user1" \
  --shm-size 512m \
  --restart always \
  mltooling/ml-workspace:0.13.2

#-------------
printf "\n\n start the traefik gateway server"
printf ".........................."
cd "${TOP_DIR}/servers/config/gateway" || exit
sudo docker run -d \
 --name "traefik-gateway" \
 --network=host -v "$PWD/traefik.yml:/etc/traefik/traefik.yml" \
 -v "$PWD/auth:/etc/traefik/auth" \
 -v "$PWD/dynamic:/etc/traefik/dynamic" \
 -v /var/run/docker.sock:/var/run/docker.sock \
 traefik:v2.5
